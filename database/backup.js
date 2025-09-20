const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { getDatabase } = require('./index');

class DatabaseBackup {
  constructor() {
    this.db = getDatabase();
    this.s3 = new AWS.S3();
    this.bucketName = process.env.AWS_S3_BACKUP_BUCKET || 'lyra-beauty-backups';
    this.dbPath = process.env.DATABASE_PATH || './database/lyra_beauty.db';
  }

  // Upload database backup to S3
  async backupToS3() {
    try {
      console.log('Starting database backup to S3...');
      
      if (!fs.existsSync(this.dbPath)) {
        throw new Error(`Database file not found: ${this.dbPath}`);
      }

      // Read the database file
      const dbData = fs.readFileSync(this.dbPath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupKey = `backups/lyra_beauty_${timestamp}.db`;

      // Upload to S3
      const uploadParams = {
        Bucket: this.bucketName,
        Key: backupKey,
        Body: dbData,
        ContentType: 'application/x-sqlite3',
        ServerSideEncryption: 'AES256'
      };

      const result = await this.s3.upload(uploadParams).promise();
      console.log(`✓ Database backed up to S3: ${result.Location}`);
      
      return {
        success: true,
        location: result.Location,
        key: backupKey,
        size: dbData.length
      };
    } catch (error) {
      console.error('S3 backup failed:', error);
      throw error;
    }
  }

  // Restore database from S3 backup
  async restoreFromS3(backupKey) {
    try {
      console.log(`Restoring database from S3: ${backupKey}`);
      
      // Download from S3
      const downloadParams = {
        Bucket: this.bucketName,
        Key: backupKey
      };

      const data = await this.s3.getObject(downloadParams).promise();
      
      // Close current database connection
      if (this.db.isReady()) {
        await this.db.close();
      }

      // Create backup of current database
      if (fs.existsSync(this.dbPath)) {
        const currentBackup = `${this.dbPath}.restore-backup.${Date.now()}`;
        fs.copyFileSync(this.dbPath, currentBackup);
        console.log(`✓ Current database backed up to: ${currentBackup}`);
      }

      // Write restored data to database file
      fs.writeFileSync(this.dbPath, data.Body);
      console.log(`✓ Database restored from S3: ${backupKey}`);
      
      return { success: true };
    } catch (error) {
      console.error('S3 restore failed:', error);
      throw error;
    }
  }

  // List available backups in S3
  async listBackups() {
    try {
      const listParams = {
        Bucket: this.bucketName,
        Prefix: 'backups/'
      };

      const data = await this.s3.listObjectsV2(listParams).promise();
      
      const backups = data.Contents.map(obj => ({
        key: obj.Key,
        lastModified: obj.LastModified,
        size: obj.Size,
        fileName: path.basename(obj.Key)
      })).sort((a, b) => b.lastModified - a.lastModified);

      return backups;
    } catch (error) {
      console.error('Failed to list S3 backups:', error);
      throw error;
    }
  }

  // Verify backup integrity
  async verifyBackup(backupKey) {
    try {
      console.log(`Verifying backup: ${backupKey}`);
      
      // Download backup and verify it's a valid SQLite database
      const downloadParams = {
        Bucket: this.bucketName,
        Key: backupKey
      };

      const data = await this.s3.getObject(downloadParams).promise();
      
      // Write to temporary file for verification
      const tempPath = `/tmp/verify_${Date.now()}.db`;
      fs.writeFileSync(tempPath, data.Body);
      
      // Try to open and query the database
      const sqlite3 = require('sqlite3').verbose();
      const testDb = new sqlite3.Database(tempPath);
      
      return new Promise((resolve, reject) => {
        testDb.get("SELECT name FROM sqlite_master WHERE type='table'", (err, row) => {
          testDb.close();
          // Clean up temp file
          fs.unlinkSync(tempPath);
          
          if (err) {
            reject(new Error(`Backup verification failed: ${err.message}`));
          } else {
            console.log(`✓ Backup verified successfully: ${backupKey}`);
            resolve({ success: true, valid: true });
          }
        });
      });
    } catch (error) {
      console.error('Backup verification failed:', error);
      throw error;
    }
  }

  // Create local backup
  async createLocalBackup() {
    try {
      if (!fs.existsSync(this.dbPath)) {
        throw new Error(`Database file not found: ${this.dbPath}`);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(path.dirname(this.dbPath), 'backups');
      
      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const backupPath = path.join(backupDir, `lyra_beauty_${timestamp}.db`);
      fs.copyFileSync(this.dbPath, backupPath);
      
      console.log(`✓ Local backup created: ${backupPath}`);
      return { success: true, path: backupPath };
    } catch (error) {
      console.error('Local backup failed:', error);
      throw error;
    }
  }

  // Automated daily backup (to be called by cron or scheduler)
  async scheduledBackup() {
    try {
      console.log('Running scheduled backup...');
      
      // Create both local and S3 backups
      const localResult = await this.createLocalBackup();
      const s3Result = await this.backupToS3();
      
      // Cleanup old local backups (keep last 7 days)
      await this.cleanupOldBackups();
      
      return {
        success: true,
        local: localResult,
        s3: s3Result
      };
    } catch (error) {
      console.error('Scheduled backup failed:', error);
      throw error;
    }
  }

  // Clean up old local backups
  async cleanupOldBackups(keepDays = 7) {
    try {
      const backupDir = path.join(path.dirname(this.dbPath), 'backups');
      
      if (!fs.existsSync(backupDir)) {
        return;
      }

      const files = fs.readdirSync(backupDir);
      const cutoffTime = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          console.log(`✓ Deleted old backup: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }
}

// Export for use in other modules
module.exports = DatabaseBackup;

// CLI interface if run directly
if (require.main === module) {
  const backup = new DatabaseBackup();
  const command = process.argv[2];
  
  switch (command) {
    case 'backup':
      backup.scheduledBackup()
        .then(() => console.log('Backup completed'))
        .catch(err => {
          console.error('Backup failed:', err);
          process.exit(1);
        });
      break;
    
    case 'list':
      backup.listBackups()
        .then(backups => {
          console.log('Available backups:');
          backups.forEach(b => {
            console.log(`  ${b.fileName} (${b.lastModified}) - ${b.size} bytes`);
          });
        })
        .catch(err => {
          console.error('Failed to list backups:', err);
          process.exit(1);
        });
      break;
    
    case 'restore':
      const backupKey = process.argv[3];
      if (!backupKey) {
        console.error('Usage: node backup.js restore <backup-key>');
        process.exit(1);
      }
      backup.restoreFromS3(backupKey)
        .then(() => console.log('Restore completed'))
        .catch(err => {
          console.error('Restore failed:', err);
          process.exit(1);
        });
      break;
    
    default:
      console.log('Usage: node backup.js [backup|list|restore <backup-key>]');
      break;
  }
}
const { getDatabase } = require('../database');

/**
 * Service for managing partner applications
 */

async function createPartnerApplication({
  userId,
  businessName,
  businessDescription,
  referralExperience,
  whyPartner
}) {
  try {
    const db = getDatabase();
    if (!db.isReady()) {
      await db.connect();
    }

    // Check if user already has a pending application
    const existingApplication = await db.get(
      'SELECT * FROM partner_applications WHERE user_id = ? AND status = ?',
      [userId, 'pending']
    );

    if (existingApplication) {
      throw new Error('You already have a pending partner application');
    }

    // Check if user is already a partner
    const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
    if (user && user.role === 'partner') {
      throw new Error('You are already a partner');
    }

    // Create the application
    const result = await db.run(`
      INSERT INTO partner_applications (
        user_id, business_name, business_description, 
        referral_experience, why_partner, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userId,
      businessName,
      businessDescription,
      referralExperience,
      whyPartner,
      'pending'
    ]);

    // Get the created application
    const application = await db.get(
      'SELECT * FROM partner_applications WHERE id = ?',
      [result.id]
    );

    console.log(`✓ Created partner application for user ${userId}`);
    return application;
  } catch (error) {
    console.error('Error creating partner application:', error);
    throw error;
  }
}

async function getPartnerApplicationById(applicationId) {
  try {
    const db = getDatabase();
    if (!db.isReady()) {
      await db.connect();
    }

    const application = await db.get(`
      SELECT pa.*, u.first_name, u.last_name, u.email, 
             admin.first_name as admin_first_name, admin.last_name as admin_last_name
      FROM partner_applications pa
      JOIN users u ON pa.user_id = u.id
      LEFT JOIN users admin ON pa.reviewed_by = admin.id
      WHERE pa.id = ?
    `, [applicationId]);

    return application;
  } catch (error) {
    console.error('Error getting partner application:', error);
    return null;
  }
}

async function getPartnerApplicationsByUser(userId) {
  try {
    const db = getDatabase();
    if (!db.isReady()) {
      await db.connect();
    }

    const applications = await db.all(
      'SELECT * FROM partner_applications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return applications;
  } catch (error) {
    console.error('Error getting user partner applications:', error);
    return [];
  }
}

async function getAllPartnerApplications(status = null) {
  try {
    const db = getDatabase();
    if (!db.isReady()) {
      await db.connect();
    }

    let query = `
      SELECT pa.*, u.first_name, u.last_name, u.email,
             admin.first_name as admin_first_name, admin.last_name as admin_last_name
      FROM partner_applications pa
      JOIN users u ON pa.user_id = u.id
      LEFT JOIN users admin ON pa.reviewed_by = admin.id
    `;
    
    const params = [];
    if (status) {
      query += ' WHERE pa.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY pa.created_at DESC';

    const applications = await db.all(query, params);
    return applications;
  } catch (error) {
    console.error('Error getting all partner applications:', error);
    return [];
  }
}

async function reviewPartnerApplication(applicationId, adminId, status, adminNotes = '') {
  try {
    const db = getDatabase();
    if (!db.isReady()) {
      await db.connect();
    }

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      throw new Error('Invalid status. Must be "approved" or "rejected"');
    }

    // Get the application
    const application = await db.get(
      'SELECT * FROM partner_applications WHERE id = ?',
      [applicationId]
    );

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'pending') {
      throw new Error('Application has already been reviewed');
    }

    // Update the application
    await db.run(`
      UPDATE partner_applications 
      SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, adminNotes, adminId, applicationId]);

    // If approved, update user role and partner status
    if (status === 'approved') {
      await db.run(`
        UPDATE users 
        SET role = ?, partner_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, ['partner', 'approved', application.user_id]);
    } else {
      // If rejected, update partner status
      await db.run(`
        UPDATE users 
        SET partner_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, ['rejected', application.user_id]);
    }

    // Get updated application
    const updatedApplication = await getPartnerApplicationById(applicationId);
    
    console.log(`✓ Partner application ${applicationId} ${status} by admin ${adminId}`);
    return updatedApplication;
  } catch (error) {
    console.error('Error reviewing partner application:', error);
    throw error;
  }
}

async function getPendingApplicationsCount() {
  try {
    const db = getDatabase();
    if (!db.isReady()) {
      await db.connect();
    }

    const result = await db.get(
      'SELECT COUNT(*) as count FROM partner_applications WHERE status = ?',
      ['pending']
    );

    return result.count || 0;
  } catch (error) {
    console.error('Error getting pending applications count:', error);
    return 0;
  }
}

async function canUserApplyForPartnership(userId) {
  try {
    const db = getDatabase();
    if (!db.isReady()) {
      await db.connect();
    }

    // Check user role
    const user = await db.get('SELECT role, partner_status FROM users WHERE id = ?', [userId]);
    if (!user) {
      return { canApply: false, reason: 'User not found' };
    }

    if (user.role === 'partner') {
      return { canApply: false, reason: 'You are already a partner' };
    }

    if (user.role === 'admin') {
      return { canApply: false, reason: 'Admins cannot apply for partnership' };
    }

    // Check for pending application
    const pendingApplication = await db.get(
      'SELECT * FROM partner_applications WHERE user_id = ? AND status = ?',
      [userId, 'pending']
    );

    if (pendingApplication) {
      return { canApply: false, reason: 'You already have a pending application' };
    }

    // Check for recent rejected application (optional - could add cooldown period)
    // For now, allow reapplication after rejection

    return { canApply: true };
  } catch (error) {
    console.error('Error checking if user can apply:', error);
    return { canApply: false, reason: 'System error' };
  }
}

module.exports = {
  createPartnerApplication,
  getPartnerApplicationById,
  getPartnerApplicationsByUser,
  getAllPartnerApplications,
  reviewPartnerApplication,
  getPendingApplicationsCount,
  canUserApplyForPartnership
};
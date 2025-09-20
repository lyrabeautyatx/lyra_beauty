const { getDatabase } = require('../database');

class ServiceController {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Get all services
   */
  async getAllServices(includeInactive = false) {
    try {
      const query = includeInactive 
        ? 'SELECT * FROM services ORDER BY created_at DESC'
        : 'SELECT * FROM services WHERE active = 1 ORDER BY created_at DESC';
      
      const services = await this.db.all(query);
      return { success: true, services };
    } catch (error) {
      console.error('Error fetching services:', error);
      return { success: false, error: 'Failed to fetch services' };
    }
  }

  /**
   * Get service by ID
   */
  async getServiceById(id) {
    try {
      const service = await this.db.get('SELECT * FROM services WHERE id = ?', [id]);
      if (!service) {
        return { success: false, error: 'Service not found' };
      }
      return { success: true, service };
    } catch (error) {
      console.error('Error fetching service:', error);
      return { success: false, error: 'Failed to fetch service' };
    }
  }

  /**
   * Create new service
   */
  async createService(serviceData) {
    try {
      // Validate input
      const validation = this.validateServiceData(serviceData);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const { service_key, name, price, duration_minutes, description } = serviceData;

      // Check if service key already exists
      const existing = await this.db.get(
        'SELECT id FROM services WHERE service_key = ?', 
        [service_key]
      );
      
      if (existing) {
        return { success: false, error: 'Service key already exists' };
      }

      // Insert new service
      const result = await this.db.run(`
        INSERT INTO services (service_key, name, price, duration_minutes, description, active)
        VALUES (?, ?, ?, ?, ?, 1)
      `, [service_key, name, price, duration_minutes || 120, description || '']);

      const newService = await this.db.get('SELECT * FROM services WHERE id = ?', [result.id]);
      
      return { 
        success: true, 
        service: newService,
        message: 'Service created successfully' 
      };
    } catch (error) {
      console.error('Error creating service:', error);
      return { success: false, error: 'Failed to create service' };
    }
  }

  /**
   * Update existing service
   */
  async updateService(id, serviceData) {
    try {
      // Check if service exists
      const existing = await this.db.get('SELECT * FROM services WHERE id = ?', [id]);
      if (!existing) {
        return { success: false, error: 'Service not found' };
      }

      // Validate input
      const validation = this.validateServiceData(serviceData, id);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const { service_key, name, price, duration_minutes, description, active } = serviceData;

      // Check if service key conflicts with another service
      if (service_key !== existing.service_key) {
        const keyExists = await this.db.get(
          'SELECT id FROM services WHERE service_key = ? AND id != ?', 
          [service_key, id]
        );
        
        if (keyExists) {
          return { success: false, error: 'Service key already exists' };
        }
      }

      // Update service
      await this.db.run(`
        UPDATE services 
        SET service_key = ?, name = ?, price = ?, duration_minutes = ?, 
            description = ?, active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        service_key, 
        name, 
        price, 
        duration_minutes || existing.duration_minutes,
        description || existing.description || '',
        active !== undefined ? active : existing.active,
        id
      ]);

      const updatedService = await this.db.get('SELECT * FROM services WHERE id = ?', [id]);
      
      return { 
        success: true, 
        service: updatedService,
        message: 'Service updated successfully' 
      };
    } catch (error) {
      console.error('Error updating service:', error);
      return { success: false, error: 'Failed to update service' };
    }
  }

  /**
   * Delete service (soft delete by setting active = 0)
   */
  async deleteService(id) {
    try {
      // Check if service exists
      const existing = await this.db.get('SELECT * FROM services WHERE id = ?', [id]);
      if (!existing) {
        return { success: false, error: 'Service not found' };
      }

      // Check if service has appointments
      const appointmentCount = await this.db.get(
        'SELECT COUNT(*) as count FROM appointments WHERE service_id = ?',
        [id]
      );

      if (appointmentCount.count > 0) {
        // Soft delete - set inactive instead of deleting
        await this.db.run(`
          UPDATE services 
          SET active = 0, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [id]);

        return { 
          success: true, 
          message: 'Service deactivated (has existing appointments)' 
        };
      } else {
        // Hard delete if no appointments
        await this.db.run('DELETE FROM services WHERE id = ?', [id]);
        
        return { 
          success: true, 
          message: 'Service deleted successfully' 
        };
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      return { success: false, error: 'Failed to delete service' };
    }
  }

  /**
   * Validate service data
   */
  validateServiceData(data, serviceId = null) {
    const { service_key, name, price, duration_minutes } = data;

    // Required fields
    if (!service_key || !name || price === undefined) {
      return { isValid: false, error: 'Service key, name, and price are required' };
    }

    // Service key validation (alphanumeric + underscore, no spaces)
    if (!/^[a-zA-Z0-9_]+$/.test(service_key)) {
      return { 
        isValid: false, 
        error: 'Service key can only contain letters, numbers, and underscores' 
      };
    }

    // Name validation
    if (name.trim().length < 2) {
      return { isValid: false, error: 'Service name must be at least 2 characters' };
    }

    // Price validation
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return { isValid: false, error: 'Price must be a positive number' };
    }

    if (priceNum > 10000) {
      return { isValid: false, error: 'Price cannot exceed $10,000' };
    }

    // Duration validation
    if (duration_minutes !== undefined) {
      const durationNum = parseInt(duration_minutes);
      if (isNaN(durationNum) || durationNum < 15 || durationNum > 480) {
        return { 
          isValid: false, 
          error: 'Duration must be between 15 and 480 minutes' 
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Toggle service active status
   */
  async toggleServiceStatus(id) {
    try {
      const service = await this.db.get('SELECT * FROM services WHERE id = ?', [id]);
      if (!service) {
        return { success: false, error: 'Service not found' };
      }

      const newStatus = service.active ? 0 : 1;
      await this.db.run(`
        UPDATE services 
        SET active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newStatus, id]);

      const updatedService = await this.db.get('SELECT * FROM services WHERE id = ?', [id]);
      
      return { 
        success: true, 
        service: updatedService,
        message: `Service ${newStatus ? 'activated' : 'deactivated'} successfully` 
      };
    } catch (error) {
      console.error('Error toggling service status:', error);
      return { success: false, error: 'Failed to update service status' };
    }
  }
}

module.exports = ServiceController;
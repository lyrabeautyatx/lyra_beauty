const partnerApplicationService = require('../services/partnerApplication');
const userService = require('../services/user');

/**
 * Controller for partner application routes
 */

async function showPartnerApplicationForm(req, res) {
  try {
    const user = req.user || req.session.user;
    
    if (!user) {
      return res.redirect('/login');
    }

    // Check if user can apply
    const eligibility = await partnerApplicationService.canUserApplyForPartnership(user.id);
    
    if (!eligibility.canApply) {
      return res.render('apply-partner', {
        user,
        error: eligibility.reason,
        success: false
      });
    }

    res.render('apply-partner', {
      user,
      error: null,
      success: false
    });
  } catch (error) {
    console.error('Error showing partner application form:', error);
    res.status(500).render('apply-partner', {
      user: req.user || req.session.user,
      error: 'System error. Please try again later.',
      success: false
    });
  }
}

async function submitPartnerApplication(req, res) {
  try {
    const user = req.user || req.session.user;
    
    if (!user) {
      return res.redirect('/login');
    }

    const { businessName, businessDescription, referralExperience, whyPartner, agreeTerms } = req.body;

    // Validate required fields
    if (!businessName || !whyPartner || !agreeTerms) {
      return res.render('apply-partner', {
        user,
        error: 'Please fill in all required fields and agree to the terms.',
        success: false
      });
    }

    // Check if user can apply
    const eligibility = await partnerApplicationService.canUserApplyForPartnership(user.id);
    
    if (!eligibility.canApply) {
      return res.render('apply-partner', {
        user,
        error: eligibility.reason,
        success: false
      });
    }

    // Create the application
    await partnerApplicationService.createPartnerApplication({
      userId: user.id,
      businessName: businessName.trim(),
      businessDescription: businessDescription ? businessDescription.trim() : null,
      referralExperience: referralExperience ? referralExperience.trim() : null,
      whyPartner: whyPartner.trim()
    });

    // TODO: Send email notification to admin about new application
    console.log(`New partner application from user ${user.email} (ID: ${user.id})`);

    res.render('apply-partner', {
      user,
      error: null,
      success: true
    });
  } catch (error) {
    console.error('Error submitting partner application:', error);
    
    let errorMessage = 'Failed to submit application. Please try again.';
    if (error.message.includes('already have a pending application')) {
      errorMessage = error.message;
    } else if (error.message.includes('already a partner')) {
      errorMessage = error.message;
    }

    res.render('apply-partner', {
      user: req.user || req.session.user,
      error: errorMessage,
      success: false
    });
  }
}

async function showApplicationStatus(req, res) {
  try {
    const user = req.user || req.session.user;
    
    if (!user) {
      return res.redirect('/login');
    }

    const applications = await partnerApplicationService.getPartnerApplicationsByUser(user.id);

    res.render('application-status', {
      user,
      applications
    });
  } catch (error) {
    console.error('Error showing application status:', error);
    res.status(500).render('error', {
      user: req.user || req.session.user,
      error: 'Unable to load application status.'
    });
  }
}

async function showAdminApplications(req, res) {
  try {
    const user = req.user || req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).send('Admin access required');
    }

    const status = req.query.status || null;
    const applications = await partnerApplicationService.getAllPartnerApplications(status);
    const pendingCount = await partnerApplicationService.getPendingApplicationsCount();

    res.render('admin-applications', {
      user,
      applications,
      pendingCount,
      currentStatus: status
    });
  } catch (error) {
    console.error('Error showing admin applications:', error);
    res.status(500).render('error', {
      user: req.user || req.session.user,
      error: 'Unable to load applications.'
    });
  }
}

async function reviewApplication(req, res) {
  try {
    const user = req.user || req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { applicationId } = req.params;
    const { status, adminNotes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatedApplication = await partnerApplicationService.reviewPartnerApplication(
      applicationId,
      user.id,
      status,
      adminNotes || ''
    );

    // TODO: Send email notification to applicant about decision
    console.log(`Application ${applicationId} ${status} by admin ${user.email}`);

    if (req.accepts('json')) {
      res.json({ success: true, application: updatedApplication });
    } else {
      res.redirect('/admin/applications');
    }
  } catch (error) {
    console.error('Error reviewing application:', error);
    
    if (req.accepts('json')) {
      res.status(500).json({ error: error.message || 'Failed to review application' });
    } else {
      res.status(500).render('error', {
        user: req.user || req.session.user,
        error: 'Failed to review application'
      });
    }
  }
}

module.exports = {
  showPartnerApplicationForm,
  submitPartnerApplication,
  showApplicationStatus,
  showAdminApplications,
  reviewApplication
};
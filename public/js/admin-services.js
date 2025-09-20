// Admin Service Management JavaScript

let services = [];

// Load services from API
async function loadServices() {
  try {
    const response = await fetch('/api/services');
    const data = await response.json();
    
    if (data.success) {
      services = data.services;
      renderServicesList();
    } else {
      showMessage('Error loading services: ' + data.error, 'error');
    }
  } catch (error) {
    console.error('Error loading services:', error);
    showMessage('Failed to load services', 'error');
  }
}

// Render services list
function renderServicesList() {
  const servicesList = document.getElementById('services-list');
  
  if (services.length === 0) {
    servicesList.innerHTML = '<p>No services found.</p>';
    return;
  }
  
  let html = '<div class="services-grid">';
  
  services.forEach(service => {
    const status = service.active ? 'Active' : 'Inactive';
    const statusClass = service.active ? 'status-active' : 'status-inactive';
    
    html += `
      <div class="service-card ${service.active ? '' : 'inactive'}">
        <div class="service-header">
          <h4>${service.name}</h4>
          <span class="service-status ${statusClass}">${status}</span>
        </div>
        <div class="service-details">
          <p><strong>Key:</strong> ${service.service_key}</p>
          <p><strong>Price:</strong> $${parseFloat(service.price).toFixed(2)}</p>
          <p><strong>Duration:</strong> ${service.duration_minutes} minutes</p>
          ${service.description ? `<p><strong>Description:</strong> ${service.description}</p>` : ''}
        </div>
        <div class="service-actions">
          <button class="btn btn-secondary btn-sm" onclick="editService(${service.id})">Edit</button>
          <button class="btn ${service.active ? 'btn-warning' : 'btn-success'} btn-sm" 
                  onclick="toggleServiceStatus(${service.id})">
            ${service.active ? 'Deactivate' : 'Activate'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteService(${service.id})">Delete</button>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  servicesList.innerHTML = html;
}

// Show add service form
function showAddServiceForm() {
  document.getElementById('add-service-form').style.display = 'block';
  document.getElementById('service-form').reset();
}

// Hide service form
function hideServiceForm() {
  document.getElementById('add-service-form').style.display = 'none';
}

// Show edit service modal
function showEditServiceModal(service) {
  document.getElementById('edit-service-id').value = service.id;
  document.getElementById('edit-service_key').value = service.service_key;
  document.getElementById('edit-name').value = service.name;
  document.getElementById('edit-price').value = service.price;
  document.getElementById('edit-duration_minutes').value = service.duration_minutes;
  document.getElementById('edit-description').value = service.description || '';
  document.getElementById('edit-active').checked = service.active;
  
  document.getElementById('edit-service-modal').style.display = 'block';
}

// Hide edit service modal
function hideEditServiceModal() {
  document.getElementById('edit-service-modal').style.display = 'none';
}

// Edit service
function editService(id) {
  const service = services.find(s => s.id === id);
  if (service) {
    showEditServiceModal(service);
  }
}

// Create service
async function createService(formData) {
  try {
    const response = await fetch('/api/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      showMessage(data.message, 'success');
      hideServiceForm();
      loadServices(); // Reload services list
    } else {
      showMessage('Error: ' + data.error, 'error');
    }
  } catch (error) {
    console.error('Error creating service:', error);
    showMessage('Failed to create service', 'error');
  }
}

// Update service
async function updateService(id, formData) {
  try {
    const response = await fetch(`/api/services/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      showMessage(data.message, 'success');
      hideEditServiceModal();
      loadServices(); // Reload services list
    } else {
      showMessage('Error: ' + data.error, 'error');
    }
  } catch (error) {
    console.error('Error updating service:', error);
    showMessage('Failed to update service', 'error');
  }
}

// Toggle service status
async function toggleServiceStatus(id) {
  const service = services.find(s => s.id === id);
  const action = service.active ? 'deactivate' : 'activate';
  
  if (!confirm(`Are you sure you want to ${action} this service?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/services/${id}/toggle`, {
      method: 'PATCH'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showMessage(data.message, 'success');
      loadServices(); // Reload services list
    } else {
      showMessage('Error: ' + data.error, 'error');
    }
  } catch (error) {
    console.error('Error toggling service status:', error);
    showMessage('Failed to update service status', 'error');
  }
}

// Delete service
async function deleteService(id) {
  const service = services.find(s => s.id === id);
  
  if (!confirm(`Are you sure you want to delete "${service.name}"? This action cannot be undone.`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/services/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showMessage(data.message, 'success');
      loadServices(); // Reload services list
    } else {
      showMessage('Error: ' + data.error, 'error');
    }
  } catch (error) {
    console.error('Error deleting service:', error);
    showMessage('Failed to delete service', 'error');
  }
}

// Show message to user
function showMessage(message, type) {
  // Create message element
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${type}`;
  messageDiv.textContent = message;
  
  // Add to page
  const container = document.querySelector('.container');
  container.insertBefore(messageDiv, container.firstChild);
  
  // Remove after 5 seconds
  setTimeout(() => {
    messageDiv.remove();
  }, 5000);
}

// Form submission handlers
document.addEventListener('DOMContentLoaded', function() {
  // Add service form submission
  document.getElementById('service-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());
    
    // Convert numeric fields
    data.price = parseFloat(data.price);
    if (data.duration_minutes) {
      data.duration_minutes = parseInt(data.duration_minutes);
    }
    
    createService(data);
  });
  
  // Edit service form submission
  document.getElementById('edit-service-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());
    const id = data.id;
    delete data.id; // Remove id from data object
    
    // Convert numeric fields
    data.price = parseFloat(data.price);
    if (data.duration_minutes) {
      data.duration_minutes = parseInt(data.duration_minutes);
    }
    
    // Convert checkbox to boolean
    data.active = document.getElementById('edit-active').checked;
    
    updateService(id, data);
  });
});

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('edit-service-modal');
  if (event.target === modal) {
    hideEditServiceModal();
  }
};
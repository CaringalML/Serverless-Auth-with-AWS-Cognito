import React, { useState } from 'react';
import EmployeeList from './EmployeeList';
import EmployeeForm from './EmployeeForm';

const EmployeeManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);

  const handleCreateNew = () => {
    setEditEmployee(null);
    setShowForm(true);
  };

  const handleEditEmployee = (employee) => {
    setEditEmployee(employee);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditEmployee(null);
  };

  const handleFormSuccess = () => {
    // Form will close automatically, list will refresh
    // No additional action needed
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <EmployeeList
          onCreateNew={handleCreateNew}
          onEditEmployee={handleEditEmployee}
        />

        {showForm && (
          <EmployeeForm
            employee={editEmployee}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default EmployeeManagement;
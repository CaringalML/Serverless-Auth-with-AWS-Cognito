import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createEmployee, updateEmployee, clearError } from '../store/slices/employeeSlice';
import authService from '../services/authService';

const EmployeeForm = ({ employee, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.employees);
  
  const isEdit = Boolean(employee);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    position: '',
    salary: '',
    hireDate: '',
    status: 'active',
    phone: '',
    address: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        department: employee.department || '',
        position: employee.position || '',
        salary: employee.salary || '',
        hireDate: employee.hireDate || '',
        status: employee.status || 'active',
        phone: employee.phone || '',
        address: employee.address || '',
        notes: employee.notes || ''
      });
    }
  }, [employee]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.position.trim()) newErrors.position = 'Position is required';

    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Salary validation
    if (formData.salary && (isNaN(formData.salary) || parseFloat(formData.salary) < 0)) {
      newErrors.salary = 'Salary must be a valid positive number';
    }

    // Date validation
    if (formData.hireDate) {
      const hireDate = new Date(formData.hireDate);
      const today = new Date();
      if (hireDate > today) {
        newErrors.hireDate = 'Hire date cannot be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Verify authentication before submitting
    try {
      const authStatus = await authService.isAuthenticated();
      if (!authStatus) {
        setErrors({ general: 'Authentication expired. Please sign in again.' });
        return;
      }
    } catch (error) {
      setErrors({ general: 'Authentication check failed. Please try again.' });
      return;
    }

    const submitData = {
      ...formData,
      salary: formData.salary ? parseFloat(formData.salary) : 0,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.toLowerCase().trim(),
      department: formData.department.trim(),
      position: formData.position.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      notes: formData.notes.trim()
    };

    try {
      if (isEdit) {
        await dispatch(updateEmployee({ 
          employeeId: employee.employeeId, 
          updateData: submitData 
        })).unwrap();
      } else {
        await dispatch(createEmployee(submitData)).unwrap();
      }
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      // Handle authentication-specific errors
      if (error.includes('Authentication required')) {
        setErrors({ general: 'Authentication expired. Please sign in again.' });
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      position: '',
      salary: '',
      hireDate: '',
      status: 'active',
      phone: '',
      address: '',
      notes: ''
    });
    setErrors({});
    onClose();
  };

  const departments = [
    'Engineering',
    'Marketing',
    'Sales',
    'Human Resources',
    'Finance',
    'Operations',
    'Customer Support',
    'Product Management',
    'Design',
    'Legal'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error Display */}
          {(error || errors.general) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-800">{error || errors.general}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    disabled={loading}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Job Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Job Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      errors.department ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department}</p>}
                </div>

                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                    Position <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      errors.position ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.position && <p className="mt-1 text-sm text-red-600">{errors.position}</p>}
                </div>

                <div>
                  <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">
                    Annual Salary (USD)
                  </label>
                  <input
                    type="number"
                    id="salary"
                    name="salary"
                    min="0"
                    step="1000"
                    value={formData.salary}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      errors.salary ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.salary && <p className="mt-1 text-sm text-red-600">{errors.salary}</p>}
                </div>

                <div>
                  <label htmlFor="hireDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Hire Date
                  </label>
                  <input
                    type="date"
                    id="hireDate"
                    name="hireDate"
                    value={formData.hireDate}
                    onChange={handleInputChange}
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      errors.hireDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.hireDate && <p className="mt-1 text-sm text-red-600">{errors.hireDate}</p>}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Additional notes about the employee..."
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={loading}
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {isEdit ? 'Update Employee' : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmployeeForm;
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchEmployees, 
  deleteEmployee, 
  deactivateEmployee, 
  clearError,
  setFilters,
  clearFilters 
} from '../store/slices/employeeSlice';
import authService from '../services/authService';

const EmployeeList = ({ onEditEmployee, onCreateNew }) => {
  const dispatch = useDispatch();
  const { 
    employees, 
    summary, 
    loading, 
    error, 
    filters 
  } = useSelector((state) => state.employees);
  
  // Add auth state tracking
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Wait for authentication to be confirmed before making API calls
    const initializeEmployeeData = async () => {
      if (!isAuthenticated) {
        return;
      }

      // Additional delay to ensure authentication cookies are ready
      // This matches the ProtectedRoute delay pattern for consistency
      setTimeout(async () => {
        try {
          // Verify we're still authenticated before making the API call
          const authStatus = await authService.isAuthenticated();
          if (authStatus) {
            await dispatch(fetchEmployees()).unwrap();
            setIsInitialized(true);
          }
        } catch (error) {
          console.error('Failed to initialize employee data:', error);
          setIsInitialized(true); // Set to true to show error state
        }
      }, 500); // 500ms delay to ensure cookies are ready
    };

    initializeEmployeeData();
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (filterType, value) => {
    dispatch(setFilters({ [filterType]: value }));
    dispatch(fetchEmployees({ [filterType]: value }));
  };

  const handleClearFilters = () => {
    dispatch(clearFilters());
    setSearchTerm('');
    dispatch(fetchEmployees());
  };

  const handleDeleteConfirm = async (employeeId, isHardDelete = false) => {
    try {
      if (isHardDelete) {
        await dispatch(deleteEmployee(employeeId)).unwrap();
      } else {
        await dispatch(deactivateEmployee(employeeId)).unwrap();
      }
      setConfirmDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const filteredEmployees = employees.filter(employee => {
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      employee.firstName?.toLowerCase().includes(search) ||
      employee.lastName?.toLowerCase().includes(search) ||
      employee.email?.toLowerCase().includes(search) ||
      employee.department?.toLowerCase().includes(search) ||
      employee.position?.toLowerCase().includes(search)
    );
  });

  const formatSalary = (salary) => {
    if (!salary) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(salary);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US');
  };

  // Show loading while initializing or while making API calls
  if (!isInitialized || (loading && employees.length === 0)) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
          <p className="text-emerald-700 font-medium">
            {!isInitialized ? 'Initializing employee data...' : 'Loading employees...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
            <p className="text-gray-600 mt-1">Manage your team members</p>
          </div>
          <button
            onClick={onCreateNew}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Employee
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600">Total Employees</h3>
            <p className="text-2xl font-bold text-blue-900">{summary.totalEmployees}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-600">Active</h3>
            <p className="text-2xl font-bold text-green-900">{summary.activeEmployees}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-600">Inactive</h3>
            <p className="text-2xl font-bold text-yellow-900">{summary.inactiveEmployees}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-600">Departments</h3>
            <p className="text-2xl font-bold text-purple-900">{summary.departmentCount}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <select
            value={filters.department}
            onChange={(e) => handleFilterChange('department', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">All Departments</option>
            {summary.departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Employee Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.121M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 00-9.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first employee.</p>
            <button
              onClick={onCreateNew}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Add Employee
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hire Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.employeeId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.position}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatSalary(employee.salary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        employee.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(employee.hireDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onEditEmployee(employee)}
                          className="text-emerald-600 hover:text-emerald-900 p-1 rounded"
                          title="Edit Employee"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: employee.employeeId, name: `${employee.firstName} ${employee.lastName}`, type: 'soft' })}
                          className="text-yellow-600 hover:text-yellow-900 p-1 rounded"
                          title="Deactivate Employee"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: employee.employeeId, name: `${employee.firstName} ${employee.lastName}`, type: 'hard' })}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Delete Employee"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {confirmDelete.type === 'hard' ? 'Delete Employee' : 'Deactivate Employee'}
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to {confirmDelete.type === 'hard' ? 'permanently delete' : 'deactivate'} <strong>{confirmDelete.name}</strong>? 
              {confirmDelete.type === 'hard' && ' This action cannot be undone.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(confirmDelete.id, confirmDelete.type === 'hard')}
                className={`px-4 py-2 text-white rounded-lg ${
                  confirmDelete.type === 'hard' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {confirmDelete.type === 'hard' ? 'Delete' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.filodelight.online';

// Axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging and authentication
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      // Redirect to signin on authentication failure
      window.location.href = '/signin';
    }
    
    return Promise.reject(error);
  }
);

const employeeService = {
  // Create a new employee
  async createEmployee(employeeData) {
    try {
      const response = await api.post('/auth/employees', employeeData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create employee');
    }
  },

  // Get all employees with optional filters
  async getEmployees(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.lastEvaluatedKey) params.append('lastEvaluatedKey', filters.lastEvaluatedKey);

      const queryString = params.toString();
      const url = queryString ? `/auth/employees?${queryString}` : '/auth/employees';
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch employees');
    }
  },

  // Update an existing employee
  async updateEmployee(employeeId, updateData) {
    try {
      const response = await api.put(`/auth/employees/${employeeId}`, updateData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update employee');
    }
  },

  // Delete an employee (hard delete)
  async deleteEmployee(employeeId) {
    try {
      const response = await api.delete(`/auth/employees/${employeeId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete employee');
    }
  },

  // Soft delete an employee (mark as inactive)
  async deactivateEmployee(employeeId) {
    try {
      const response = await api.delete(`/auth/employees/${employeeId}?soft=true`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to deactivate employee');
    }
  },

  // Get employee by ID (if needed for detail view)
  async getEmployeeById(employeeId) {
    try {
      // Since we don't have a specific GET by ID endpoint, we'll get all and filter
      const response = await this.getEmployees();
      const employee = response.employees.find(emp => emp.employeeId === employeeId);
      
      if (!employee) {
        throw new Error('Employee not found');
      }
      
      return { employee };
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch employee details');
    }
  }
};

export default employeeService;
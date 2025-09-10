import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import employeeService from '../../services/employeeService';

// Async thunks for employee operations
export const createEmployee = createAsyncThunk(
  'employees/create',
  async (employeeData, { rejectWithValue }) => {
    try {
      const response = await employeeService.createEmployee(employeeData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchEmployees = createAsyncThunk(
  'employees/fetchAll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await employeeService.getEmployees(filters);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateEmployee = createAsyncThunk(
  'employees/update',
  async ({ employeeId, updateData }, { rejectWithValue }) => {
    try {
      const response = await employeeService.updateEmployee(employeeId, updateData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  'employees/delete',
  async (employeeId, { rejectWithValue }) => {
    try {
      const response = await employeeService.deleteEmployee(employeeId);
      return { ...response, employeeId };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deactivateEmployee = createAsyncThunk(
  'employees/deactivate',
  async (employeeId, { rejectWithValue }) => {
    try {
      const response = await employeeService.deactivateEmployee(employeeId);
      return { ...response, employeeId };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  employees: [],
  summary: {
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    departments: [],
    departmentCount: 0,
    totalSalaryBudget: 0
  },
  loading: false,
  error: null,
  hasMore: false,
  lastEvaluatedKey: null,
  filters: {
    department: '',
    status: '',
    search: ''
  }
};

const employeeSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    resetEmployees: (state) => {
      state.employees = [];
      state.hasMore = false;
      state.lastEvaluatedKey = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Create Employee
      .addCase(createEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.employees.unshift(action.payload.employee);
        state.summary.totalEmployees += 1;
        if (action.payload.employee.status === 'active') {
          state.summary.activeEmployees += 1;
        } else {
          state.summary.inactiveEmployees += 1;
        }
      })
      .addCase(createEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Employees
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload.employees;
        state.summary = action.payload.summary;
        state.hasMore = action.payload.hasMore;
        state.lastEvaluatedKey = action.payload.lastEvaluatedKey;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update Employee
      .addCase(updateEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.employees.findIndex(
          emp => emp.employeeId === action.payload.employee.employeeId
        );
        if (index !== -1) {
          state.employees[index] = action.payload.employee;
        }
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete Employee
      .addCase(deleteEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = state.employees.filter(
          emp => emp.employeeId !== action.payload.employeeId
        );
        state.summary.totalEmployees -= 1;
      })
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Deactivate Employee
      .addCase(deactivateEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deactivateEmployee.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.employees.findIndex(
          emp => emp.employeeId === action.payload.employeeId
        );
        if (index !== -1) {
          state.employees[index].status = 'inactive';
          state.employees[index].updatedAt = action.payload.deletedAt;
          state.summary.activeEmployees -= 1;
          state.summary.inactiveEmployees += 1;
        }
      })
      .addCase(deactivateEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, setFilters, clearFilters, resetEmployees } = employeeSlice.actions;
export default employeeSlice.reducer;
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null, allowedRoles = [] }) => {
  const { user, isAuthenticated, getUserRole, logout } = useAuth();

  if (!isAuthenticated) {
    return null; // This will be handled by the main navigation
  }

  const userRole = getUserRole();

  // Check if user has required role or is in allowed roles
  const hasAccess = () => {
    if (!requiredRole && allowedRoles.length === 0) return true;
    if (requiredRole && userRole === requiredRole) return true;
    if (allowedRoles.length > 0 && allowedRoles.includes(userRole)) return true;
    return false;
  };

  if (!hasAccess()) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="lock-closed-outline" size={64} color="#EF4444" />
          <Text style={styles.title}>Access Denied</Text>
          <Text style={styles.message}>
            You don't have permission to access this section.
          </Text>
          <Text style={styles.roleInfo}>
            Your role: {userRole}
            {requiredRole && ` • Required: ${requiredRole}`}
            {allowedRoles.length > 0 && ` • Allowed: ${allowedRoles.join(', ')}`}
          </Text>
          <TouchableOpacity style={styles.button} onPress={logout}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return children;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  roleInfo: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProtectedRoute;
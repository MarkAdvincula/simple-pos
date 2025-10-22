import React, { createContext, useContext, useState, useEffect } from 'react';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth0Config } from '../config/auth0Config';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext({});

const discovery = {
  authorizationEndpoint: `https://${auth0Config.domain}/authorize`,
  tokenEndpoint: `https://${auth0Config.domain}/oauth/token`,
  revocationEndpoint: `https://${auth0Config.domain}/oauth/revoke`,
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);

  // Use different redirect URIs based on environment
  const redirectUri = makeRedirectUri({
    scheme: auth0Config.customScheme,
    path: 'auth',
  });

  // Debug: Log the redirect URI so we can see what it generates
  console.log('Generated redirect URI:', redirectUri);
  console.log('Environment:', __DEV__ ? 'Development' : 'Production');

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: auth0Config.clientId,
      scopes: auth0Config.scope.split(' '),
      additionalParameters: {},
      redirectUri,
    },
    discovery
  );

  useEffect(() => {
    checkAuthState();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      console.log('Auth success response:', response.params);
      exchangeCodeForToken(response.params.code);
    } else if (response?.type === 'error') {
      console.log('Auth error:', response.error);
      setIsLoading(false);
    } else if (response) {
      console.log('Auth response type:', response.type, response);
    }
  }, [response]);

  const checkAuthState = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const storedToken = await AsyncStorage.getItem('accessToken');

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setAccessToken(storedToken);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.log('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exchangeCodeForToken = async (code) => {
    try {
      setIsLoading(true);
      console.log('Exchanging code for token...');

      const tokenResponse = await fetch(`https://${auth0Config.domain}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: auth0Config.clientId,
          code,
          redirect_uri: redirectUri,
          code_verifier: request?.codeVerifier,
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log('Token response:', tokenData);

      if (tokenData.access_token) {
        setAccessToken(tokenData.access_token);
        await AsyncStorage.setItem('accessToken', tokenData.access_token);
        console.log('Token saved successfully');

        // Fetch user info
        const userResponse = await fetch(`https://${auth0Config.domain}/userinfo`, {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });

        const userData = await userResponse.json();
        console.log('User data received:', userData);

        setUser(userData);
        setIsAuthenticated(true);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        console.log('User data saved to storage');
      } else {
        console.log('No access token in response:', tokenData);
      }
    } catch (error) {
      console.log('Token exchange error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      setIsLoading(true);
      await promptAsync();
    } catch (error) {
      console.log('Login error:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['user', 'accessToken']);
      setUser(null);
      setAccessToken(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  const getUserRole = () => {
    if (!user) return null;

    // Check user metadata for role - try different possible locations
    const roles = user['https://simplepos.app/roles'] ||
                  user.app_metadata?.roles ||
                  user['custom:role'] ||
                  user.role ||
                  [];

    if (Array.isArray(roles)) {
      if (roles.includes('admin')) return 'admin';
      if (roles.includes('cashier')) return 'cashier';
    } else if (typeof roles === 'string') {
      if (roles === 'admin') return 'admin';
      if (roles === 'cashier') return 'cashier';
    }

    // Default to admin for testing - you can change this to 'cashier' later
    return 'admin';
  };

  const isAdmin = () => getUserRole() === 'admin';
  const isCashier = () => getUserRole() === 'cashier';

  const value = {
    user,
    isLoading,
    isAuthenticated,
    accessToken,
    login,
    logout,
    getUserRole,
    isAdmin,
    isCashier,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Platform 
} from 'react-native'; // Platform is correctly imported
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as logger from '../src/services/loggerService';
import { useTheme } from '../src/theme/theme';
import COLORS from '../src/constants/colors';

/**
 * Debug screen for development purposes
 * Shows system information, network status, and stored data
 */
export default function DebugScreen() {
  const [systemInfo, setSystemInfo] = useState({});
  const [storageKeys, setStorageKeys] = useState([]);
  const [networkStatus, setNetworkStatus] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);
  const [keyValue, setKeyValue] = useState(null);
  const { colors: _colors, spacing: _spacing } = useTheme(); // Kept for future use

  useEffect(() => {
    // Gather system information
    const info = {
      platform: Platform.OS,
      version: Platform.Version,
      isDevice: Platform.isTV ? 'TV' : 'Mobile/Tablet',
      constants: Platform.constants || {},
      timestamp: new Date().toISOString(),
    };
    setSystemInfo(info);
    
    // Log debug screen access
    logger.info('Debug screen accessed', { platform: Platform.OS });
    
    // Get all storage keys
    fetchStorageKeys();
    
    // Get network status
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkStatus({
        isConnected: state.isConnected,
        type: state.type,
        details: state.details || {},
      });
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const fetchStorageKeys = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      setStorageKeys(keys);
    } catch (error) {
      logger.error('Failed to fetch storage keys', { error: error.message });
    }
  };

  const viewKeyValue = async (key) => {
    try {
      setSelectedKey(key);
      const value = await AsyncStorage.getItem(key);
      setKeyValue(value);
    } catch (error) {
      logger.error('Failed to fetch key value', { key, error: error.message });
      setKeyValue(null);
    }
  };

  const clearAllData = async () => {
    try {
      await AsyncStorage.clear();
      logger.info('All storage data cleared');
      fetchStorageKeys();
      setSelectedKey(null);
      setKeyValue(null);
    } catch (error) {
      logger.error('Failed to clear storage', { error: error.message });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Debug Information</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Information</Text>
        {Object.entries(systemInfo).map(([key, value]) => (
          <Text key={key} style={styles.infoText}>
            {key}: {typeof value === 'object' ? JSON.stringify(value) : value}
          </Text>
        ))}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network Status</Text>
        {Object.entries(networkStatus).map(([key, value]) => (
          <Text key={key} style={styles.infoText}>
            {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </Text>
        ))}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage Keys</Text>
        <View style={styles.keyList}>
          {storageKeys.length > 0 ? (
            storageKeys.map(key => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.keyItem,
                  selectedKey === key && styles.selectedKey
                ]}
                onPress={() => viewKeyValue(key)}
              >
                <Text style={styles.keyText}>{key}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.infoText}>No storage keys found</Text>
          )}
        </View>
      </View>
      
      {selectedKey && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Value for: {selectedKey}</Text>
          <ScrollView style={styles.valueContainer}>
            <Text style={styles.valueText}>
              {keyValue !== null ? keyValue : 'null'}
            </Text>
          </ScrollView>
        </View>
      )}
      
      <TouchableOpacity
        style={styles.dangerButton}
        onPress={clearAllData}
      >
        <Text style={styles.dangerButtonText}>Clear All Data</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.gray100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.text,
  },
  section: {
    marginBottom: 24,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.text,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
    color: COLORS.gray600,
  },
  keyList: {
    marginTop: 8,
  },
  keyItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  selectedKey: {
    backgroundColor: COLORS.blue100,
  },
  keyText: {
    fontSize: 14,
    color: COLORS.text,
  },
  valueContainer: {
    maxHeight: 200,
    backgroundColor: COLORS.gray50,
    padding: 8,
    borderRadius: 4,
  },
  valueText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  dangerButton: {
    backgroundColor: COLORS.red,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  dangerButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

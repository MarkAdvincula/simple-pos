// ./src/components/DateFilter.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const DateFilter = ({ selectedDate, onDateChange, showQuickFilters = true }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date(selectedDate));

  // Quick filter options
  const getQuickFilterDates = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return {
      today,
      yesterday,
      weekAgo,
      monthAgo
    };
  };

  const quickDates = getQuickFilterDates();

  const handleDateSelect = (date) => {
    setTempDate(date);
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      onDateChange(date);
    }
  };

  const handleDateConfirm = () => {
    setShowDatePicker(false);
    onDateChange(tempDate);
  };

  const formatDateDisplay = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isDateSelected = (filterDate) => {
    const selected = new Date(selectedDate);
    return (
      selected.getDate() === filterDate.getDate() &&
      selected.getMonth() === filterDate.getMonth() &&
      selected.getFullYear() === filterDate.getFullYear()
    );
  };

  return (
    <View style={styles.container}>
      {/* Current Date Display */}
      <TouchableOpacity
        style={styles.dateDisplay}
        onPress={() => setShowDatePicker(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar" size={20} color="#2563eb" />
        <Text style={styles.dateText}>{formatDateDisplay(new Date(selectedDate))}</Text>
        <Ionicons name="chevron-down" size={16} color="#6b7280" />
      </TouchableOpacity>

      {/* Quick Filter Buttons */}
      {showQuickFilters && (
        <View style={styles.quickFilters}>
          <TouchableOpacity
            style={[
              styles.quickButton,
              isDateSelected(quickDates.today) && styles.quickButtonActive
            ]}
            onPress={() => onDateChange(quickDates.today)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.quickButtonText,
              isDateSelected(quickDates.today) && styles.quickButtonTextActive
            ]}>
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickButton,
              isDateSelected(quickDates.yesterday) && styles.quickButtonActive
            ]}
            onPress={() => onDateChange(quickDates.yesterday)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.quickButtonText,
              isDateSelected(quickDates.yesterday) && styles.quickButtonTextActive
            ]}>
              Yesterday
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickButton,
              isDateSelected(quickDates.weekAgo) && styles.quickButtonActive
            ]}
            onPress={() => onDateChange(quickDates.weekAgo)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.quickButtonText,
              isDateSelected(quickDates.weekAgo) && styles.quickButtonTextActive
            ]}>
              Week Ago
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Date Picker Modal for iOS */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.modalButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity
                  onPress={handleDateConfirm}
                  style={styles.modalButton}
                >
                  <Text style={styles.confirmButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="wheels"
                onChange={(event, date) => date && setTempDate(date)}
                maximumDate={new Date()}
                style={styles.datePicker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Date Picker for Android */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            if (event.type === 'set' && date) {
              handleDateSelect(date);
            } else {
              setShowDatePicker(false);
            }
          }}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginLeft: 8,
  },
  quickFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  quickButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  quickButtonTextActive: {
    color: '#ffffff',
  },
  // Modal styles for iOS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area padding for iOS
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  datePicker: {
    backgroundColor: '#ffffff',
  },
});

export default DateFilter;
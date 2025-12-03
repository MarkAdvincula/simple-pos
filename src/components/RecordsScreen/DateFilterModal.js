import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * Modal component for date filtering options
 */
const DateFilterModal = ({
    visible,
    dateFilter,
    selectedDay,
    customStartDate,
    customEndDate,
    showDayPicker,
    showStartDatePicker,
    showEndDatePicker,
    onClose,
    onFilterChange,
    onDayConfirm,
    onCustomDateConfirm,
    onDayChange,
    onStartDateChange,
    onEndDateChange,
    setShowDayPicker,
    setShowStartDatePicker,
    setShowEndDatePicker,
}) => {
    const filterOptions = [
        { key: 'all', label: 'All Time', icon: 'infinite-outline' },
        { key: 'today', label: 'Today', icon: 'today-outline' },
        { key: 'day', label: 'Select Day', icon: 'calendar-outline' },
        { key: 'week', label: 'This Week', icon: 'calendar-outline' },
        { key: 'month', label: 'This Month', icon: 'calendar-outline' },
        { key: 'custom', label: 'Custom Range', icon: 'options-outline' }
    ];

    return (
        <>
            <Modal
                animationType="slide"
                transparent={true}
                visible={visible}
                onRequestClose={onClose}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter by Date</Text>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={onClose}
                            >
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterOptionsContainer}>
                            {filterOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.key}
                                    style={[
                                        styles.filterOption,
                                        dateFilter === option.key && styles.filterOptionActive
                                    ]}
                                    onPress={() => onFilterChange(option.key)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={option.icon}
                                        size={20}
                                        color={dateFilter === option.key ? '#2563eb' : '#6b7280'}
                                    />
                                    <Text style={[
                                        styles.filterOptionText,
                                        dateFilter === option.key && styles.filterOptionTextActive
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {dateFilter === option.key && (
                                        <Ionicons name="checkmark" size={20} color="#2563eb" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {dateFilter === 'day' && (
                            <View style={styles.customDateContainer}>
                                <Text style={styles.customDateLabel}>Select Day</Text>

                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => setShowDayPicker(true)}
                                >
                                    <Ionicons name="calendar" size={16} color="#6b7280" />
                                    <Text style={styles.dateButtonText}>
                                        {selectedDay.toLocaleDateString()}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.confirmCustomDateButton}
                                    onPress={onDayConfirm}
                                >
                                    <Text style={styles.confirmCustomDateText}>Apply Day</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {dateFilter === 'custom' && (
                            <View style={styles.customDateContainer}>
                                <Text style={styles.customDateLabel}>Select Date Range</Text>

                                <View style={styles.dateRangeContainer}>
                                    <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => setShowStartDatePicker(true)}
                                    >
                                        <Ionicons name="calendar" size={16} color="#6b7280" />
                                        <Text style={styles.dateButtonText}>
                                            From: {customStartDate.toLocaleDateString()}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => setShowEndDatePicker(true)}
                                    >
                                        <Ionicons name="calendar" size={16} color="#6b7280" />
                                        <Text style={styles.dateButtonText}>
                                            To: {customEndDate.toLocaleDateString()}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={styles.confirmCustomDateButton}
                                    onPress={onCustomDateConfirm}
                                >
                                    <Text style={styles.confirmCustomDateText}>Apply Date Range</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Date Pickers */}
            {showDayPicker && (
                <DateTimePicker
                    value={selectedDay}
                    mode="date"
                    display="default"
                    onChange={onDayChange}
                />
            )}

            {showStartDatePicker && (
                <DateTimePicker
                    value={customStartDate}
                    mode="date"
                    display="default"
                    onChange={onStartDateChange}
                />
            )}

            {showEndDatePicker && (
                <DateTimePicker
                    value={customEndDate}
                    mode="date"
                    display="default"
                    onChange={onEndDateChange}
                />
            )}
        </>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 60,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    modalCloseButton: {
        padding: 4,
    },
    filterOptionsContainer: {
        paddingVertical: 20,
    },
    filterOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#f9fafb',
        gap: 12,
    },
    filterOptionActive: {
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    filterOptionText: {
        fontSize: 16,
        color: '#6b7280',
        flex: 1,
        fontWeight: '500',
    },
    filterOptionTextActive: {
        color: '#2563eb',
        fontWeight: '600',
    },
    customDateContainer: {
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 20,
        paddingBottom: 20,
    },
    customDateLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 16,
        textAlign: 'center',
    },
    dateRangeContainer: {
        gap: 12,
        marginBottom: 20,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        gap: 8,
    },
    dateButtonText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    confirmCustomDateButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    confirmCustomDateText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default DateFilterModal;

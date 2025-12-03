import { useState, useCallback } from 'react';
import { getFilterDisplayText } from '../utils/dateUtils';

/**
 * Custom hook for managing date filter state
 */
export const useDateFilter = (initialFilter = 'today') => {
    const [dateFilter, setDateFilter] = useState(initialFilter);
    const [selectedDay, setSelectedDay] = useState(new Date());
    const [customStartDate, setCustomStartDate] = useState(new Date());
    const [customEndDate, setCustomEndDate] = useState(new Date());
    const [showDateFilterModal, setShowDateFilterModal] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showDayPicker, setShowDayPicker] = useState(false);

    const handleDateFilterChange = useCallback((filter) => {
        setDateFilter(filter);
        if (filter !== 'custom' && filter !== 'day') {
            setShowDateFilterModal(false);
        }
    }, []);

    const handleCustomDateConfirm = useCallback(() => {
        setDateFilter('custom');
        setShowDateFilterModal(false);
    }, []);

    const handleDayConfirm = useCallback(() => {
        setDateFilter('day');
        setShowDateFilterModal(false);
    }, []);

    const onDayChange = useCallback((event, selectedDate) => {
        setShowDayPicker(false);
        if (selectedDate) {
            setSelectedDay(selectedDate);
        }
    }, []);

    const onStartDateChange = useCallback((event, selectedDate) => {
        setShowStartDatePicker(false);
        if (selectedDate) {
            setCustomStartDate(selectedDate);
        }
    }, []);

    const onEndDateChange = useCallback((event, selectedDate) => {
        setShowEndDatePicker(false);
        if (selectedDate) {
            setCustomEndDate(selectedDate);
        }
    }, []);

    const displayText = useCallback(() => {
        return getFilterDisplayText(dateFilter, selectedDay, customStartDate, customEndDate);
    }, [dateFilter, selectedDay, customStartDate, customEndDate]);

    return {
        // State
        dateFilter,
        selectedDay,
        customStartDate,
        customEndDate,
        showDateFilterModal,
        showStartDatePicker,
        showEndDatePicker,
        showDayPicker,

        // Setters
        setDateFilter,
        setSelectedDay,
        setCustomStartDate,
        setCustomEndDate,
        setShowDateFilterModal,
        setShowStartDatePicker,
        setShowEndDatePicker,
        setShowDayPicker,

        // Handlers
        handleDateFilterChange,
        handleCustomDateConfirm,
        handleDayConfirm,
        onDayChange,
        onStartDateChange,
        onEndDateChange,
        displayText,
    };
};

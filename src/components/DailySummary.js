// ./src/components/DailySummary.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DailySummary = ({ summary, selectedDate, loading }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `₱${(amount || 0).toFixed(2)}`;
  };

  const isToday = () => {
    const today = new Date();
    const selected = new Date(selectedDate);
    return (
      today.getDate() === selected.getDate() &&
      today.getMonth() === selected.getMonth() &&
      today.getFullYear() === selected.getFullYear()
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingCard}>
          <Ionicons name="refresh" size={24} color="#6b7280" />
          <Text style={styles.loadingText}>Loading summary...</Text>
        </View>
      </View>
    );
  }

  // No Data State
  if ((!summary || summary.total_transactions === 0) && !loading) {
    return (
      <View style={styles.container}>
        <View style={styles.noDataCard}>
          <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
          <Text style={styles.noDataTitle}>No transactions yet</Text>
          <Text style={styles.noDataText}>
            {isToday()
              ? "Start making sales to see your daily summary here"
              : "No transactions were recorded on this date"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.dateTitle}>
          {isToday() ? "Today's Summary" : formatDate(selectedDate)}
        </Text>
        <Text style={styles.subtitle}>
          Sales overview for {isToday() ? "today" : "selected date"}
        </Text>
      </View>

      <View style={styles.summaryGrid}>
        {/* Total Sales */}
        <View style={[styles.summaryCard, styles.totalSalesCard]}>
          <View style={styles.cardIcon}>
            <Ionicons name="trending-up" size={24} color="#16a34a" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Total Sales</Text>
            <Text style={[styles.cardValue, styles.totalSalesValue]}>
              {formatCurrency(summary?.total_sales)}
            </Text>
          </View>
        </View>

        {/* Transaction Count */}
        <View style={[styles.summaryCard, styles.transactionCard]}>
          <View style={styles.cardIcon}>
            <Ionicons name="receipt" size={24} color="#2563eb" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Transactions</Text>
            <Text style={[styles.cardValue, styles.transactionValue]}>
              {summary?.total_transactions || 0}
            </Text>
          </View>
        </View>

        {/* Average Sale */}
        <View style={[styles.summaryCard, styles.averageCard]}>
          <View style={styles.cardIcon}>
            <Ionicons name="analytics" size={24} color="#7c3aed" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Average Sale</Text>
            <Text style={[styles.cardValue, styles.averageValue]}>
              {formatCurrency(summary?.average_sale)}
            </Text>
          </View>
        </View>
      </View>

      {/* Additional Insights */}
      {summary && summary.total_transactions > 0 && (
        <View style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>Quick Insights</Text>
          <View style={styles.insightsList}>
            <View style={styles.insightItem}>
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
              <Text style={styles.insightText}>
                {summary.total_transactions} successful transaction
                {summary.total_transactions !== 1 ? "s" : ""}
              </Text>
            </View>
            {summary.average_sale > 0 && (
              <View style={styles.insightItem}>
                <Ionicons name="trending-up" size={16} color="#2563eb" />
                <Text style={styles.insightText}>
                  Average sale of {formatCurrency(summary.average_sale)} per transaction
                </Text>
              </View>
            )}
            {summary.total_sales > 1000 && (
              <View style={styles.insightItem}>
                <Ionicons name="star" size={16} color="#f59e0b" />
                <Text style={styles.insightText}>
                  Great day! Sales exceeded ₱1,000
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#6b7280',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  totalSalesCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
  },
  transactionCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  averageCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#7c3aed',
  },
  cardIcon: {
    marginBottom: 8,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalSalesValue: {
    color: '#16a34a',
  },
  transactionValue: {
    color: '#2563eb',
  },
  averageValue: {
    color: '#7c3aed',
  },
  insightsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  insightsList: {
    gap: 8,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
    flex: 1,
  },
  noDataCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default DailySummary;

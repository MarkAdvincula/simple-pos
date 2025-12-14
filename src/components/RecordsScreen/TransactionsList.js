import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import TransactionCard from './TransactionCard';

/**
 * Component to display list of transactions with pagination
 */
const TransactionsList = ({ transactions, hasMoreData, onLoadMore, loading }) => {
    const [expandedItems, setExpandedItems] = useState({});

    const toggleAccordion = useCallback((transactionId) => {
        setExpandedItems(prev => ({
            ...prev,
            [transactionId]: !prev[transactionId]
        }));
    }, []);

    const renderTransactionItem = useCallback(({ item }) => {
        return (
            <TransactionCard
                transaction={item}
                isExpanded={expandedItems[item.id]}
                onToggle={() => toggleAccordion(item.id)}
            />
        );
    }, [expandedItems, toggleAccordion]);

    const renderFooter = useCallback(() => {
        if (!hasMoreData) return null;

        return (
            <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={onLoadMore}
                disabled={loading}
            >
                <Text style={styles.loadMoreText}>
                    {loading ? 'Loading...' : 'Load More Transactions'}
                </Text>
            </TouchableOpacity>
        );
    }, [hasMoreData, loading, onLoadMore]);

    return (
        <View style={styles.transactionsList}>
            <Text style={styles.transactionsListTitle}>Recent Transactions</Text>
            <FlatList
                data={transactions}
                renderItem={renderTransactionItem}
                keyExtractor={(item) => `transaction_${item.id}`}
                scrollEnabled={false}
                ListFooterComponent={renderFooter}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                windowSize={10}
                initialNumToRender={10}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    transactionsList: {
        marginBottom: 20,
    },
    transactionsListTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
        textAlign: 'center',
    },
    loadMoreButton: {
        backgroundColor: '#e5e7eb',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 16,
    },
    loadMoreText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
});

export default TransactionsList;

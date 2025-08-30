import { View, Text, FlatList, StyleSheet } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import databaseService from '../src/services/database'

const TransactionsScreen = () => {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const data = await databaseService.getTransactions()
      setTransactions(data)
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionCard}>
      <Text style={styles.transactionId}>Transaction #{item.id}</Text>
      <Text style={styles.datetime}>{new Date(item.transaction_datetime).toLocaleString()}</Text>
      <Text style={styles.amount}>₱{item.total_amount.toFixed(2)}</Text>
      <Text style={styles.payment}>{item.payment_method}</Text>
      
      <View style={styles.itemsContainer}>
        {item.items.map((orderItem, index) => (
          <Text key={index} style={styles.item}>
            {orderItem.item_name} x{orderItem.quantity} - ₱{orderItem.line_total.toFixed(2)}
          </Text>
        ))}
      </View>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Transactions</Text>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id.toString()}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  transactionCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  transactionId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  datetime: {
    fontSize: 14,
    color: '#666',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  payment: {
    fontSize: 14,
    color: '#666',
  },
  itemsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  item: {
    fontSize: 12,
    color: '#555',
  },
})

export default TransactionsScreen;
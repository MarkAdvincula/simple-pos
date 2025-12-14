import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Modal, TextInput, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Picker } from '@react-native-picker/picker'
import databaseService from '../src/services/database'
import menuExportService from '../src/services/menuExportService'

const MaintenanceScreen = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Edit modal states
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  
  // Add item modal states
  const [addItemModalVisible, setAddItemModalVisible] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  
  // Add category modal states
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  useEffect(() => {
    loadCategoriesWithItems()
  }, [])

  const loadCategoriesWithItems = async () => {
    try {
      setLoading(true)
      const categoriesData = await databaseService.getCategoriesWithItems()
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadCategoriesWithItems()
    setRefreshing(false)
  }

  // Edit item functions
  const openEditModal = (item, categoryId) => {
    setEditingItem({ ...item, categoryId })
    setEditName(item.item_name)
    setEditPrice(item.price.toString())
    setEditModalVisible(true)
  }

  const closeEditModal = () => {
    setEditModalVisible(false)
    setEditingItem(null)
    setEditName('')
    setEditPrice('')
  }

  const saveEdit = async () => {
    if (!editName.trim() || !editPrice.trim()) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    const price = parseFloat(editPrice)
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price')
      return
    }

    try {
      await databaseService.updateItem(editingItem.id, editName.trim(), price)
      closeEditModal()
      await loadCategoriesWithItems()
      Alert.alert('Success', 'Item updated successfully')
    } catch (error) {
      console.error('Error updating item:', error)
      Alert.alert('Error', 'Failed to update item')
    }
  }

  // Add item functions
  const openAddItemModal = () => {
    if (categories.length === 0) {
      Alert.alert('Error', 'Please add a category first')
      return
    }
    setSelectedCategoryId(categories[0].id.toString())
    setAddItemModalVisible(true)
  }

  const closeAddItemModal = () => {
    setAddItemModalVisible(false)
    setNewItemName('')
    setNewItemPrice('')
    setSelectedCategoryId('')
  }

  const saveNewItem = async () => {
    if (!newItemName.trim() || !newItemPrice.trim() || !selectedCategoryId) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    const price = parseFloat(newItemPrice)
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price')
      return
    }

    try {
      await databaseService.addItem(parseInt(selectedCategoryId), newItemName.trim(), price)
      closeAddItemModal()
      await loadCategoriesWithItems()
      Alert.alert('Success', 'Item added successfully')
    } catch (error) {
      console.error('Error adding item:', error)
      Alert.alert('Error', 'Failed to add item')
    }
  }

  // Add category functions
  const openAddCategoryModal = () => {
    setAddCategoryModalVisible(true)
  }

  const closeAddCategoryModal = () => {
    setAddCategoryModalVisible(false)
    setNewCategoryName('')
  }

  const saveNewCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name')
      return
    }

    try {
      await databaseService.addCategory(newCategoryName.trim())
      closeAddCategoryModal()
      await loadCategoriesWithItems()
      Alert.alert('Success', 'Category added successfully')
    } catch (error) {
      console.error('Error adding category:', error)
      Alert.alert('Error', 'Failed to add category')
    }
  }

  // Delete item function
  const deleteItem = async (itemId, itemName) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${itemName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteItem(itemId)
              await loadCategoriesWithItems()
              Alert.alert('Success', 'Item deleted successfully')
            } catch (error) {
              console.error('Error deleting item:', error)
              Alert.alert('Error', 'Failed to delete item')
            }
          }
        }
      ]
    )
  }

  // Menu export/import functions
  const handleExportMenu = () => {
    Alert.alert(
      'Export Menu',
      'Choose export format:',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'JSON',
          onPress: exportMenuAsJSON
        },
        {
          text: 'CSV',
          onPress: exportMenuAsCSV
        }
      ]
    )
  }

  const exportMenuAsJSON = async () => {
    try {
      const result = await menuExportService.exportMenuToJSON()
      if (result.success) {
        Alert.alert('Success', result.message)
      } else {
        Alert.alert('Error', result.error)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export menu')
    }
  }

  const exportMenuAsCSV = async () => {
    try {
      const result = await menuExportService.exportMenuToCSV()
      if (result.success) {
        Alert.alert('Success', result.message)
      } else {
        Alert.alert('Error', result.error)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export menu')
    }
  }

  const handleImportMenu = async () => {
    try {
      const result = await menuExportService.showImportOptions()
      if (result.success) {
        await loadCategoriesWithItems()
        Alert.alert('Success', result.message)
      } else if (result.error !== 'Import cancelled') {
        Alert.alert('Error', result.error)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import menu')
    }
  }

  const handleClearMenu = async () => {
    try {
      const result = await menuExportService.clearMenuWithConfirmation()
      if (result.success) {
        await loadCategoriesWithItems()
        Alert.alert('Success', result.message)
      } else if (result.error !== 'Operation cancelled') {
        Alert.alert('Error', result.error)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to clear menu')
    }
  }

  const handleMoveCategoryUp = async (categoryId) => {
    try {
      await databaseService.moveCategoryUp(categoryId)
      await loadCategoriesWithItems()
    } catch (error) {
      console.error('Error moving category up:', error)
      Alert.alert('Error', 'Failed to reorder category')
    }
  }

  const handleMoveCategoryDown = async (categoryId) => {
    try {
      await databaseService.moveCategoryDown(categoryId)
      await loadCategoriesWithItems()
    } catch (error) {
      console.error('Error moving category down:', error)
      Alert.alert('Error', 'Failed to reorder category')
    }
  }

  const renderCategory = ({ item, index }) => (
    <View style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryName}>{item.category_name}</Text>
        <View style={styles.categoryOrderButtons}>
          <TouchableOpacity
            style={[styles.orderButton, index === 0 && styles.orderButtonDisabled]}
            onPress={() => handleMoveCategoryUp(item.id)}
            disabled={index === 0}
          >
            <Ionicons
              name="chevron-up"
              size={18}
              color={index === 0 ? '#ccc' : '#2563eb'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.orderButton, index === categories.length - 1 && styles.orderButtonDisabled]}
            onPress={() => handleMoveCategoryDown(item.id)}
            disabled={index === categories.length - 1}
          >
            <Ionicons
              name="chevron-down"
              size={18}
              color={index === categories.length - 1 ? '#ccc' : '#2563eb'}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.itemsContainer}>
        {item.items.map((menuItem, index) => (
          <View key={index} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{menuItem.item_name}</Text>
              <Text style={styles.itemPrice}>₱{menuItem.price.toFixed(2)}</Text>
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openEditModal(menuItem, item.id)}
              >
                <Ionicons name="pencil" size={16} color="#2e7d32" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => deleteItem(menuItem.id, menuItem.item_name)}
              >
                <Ionicons name="trash" size={16} color="#d32f2f" />
              </TouchableOpacity>
            </View>
          </View>
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
      <View style={styles.header}>
        <Text style={styles.title}>Menu Items</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.addButton} onPress={openAddCategoryModal}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Category</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={openAddItemModal}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Item</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.menuActions}>
        <TouchableOpacity style={styles.exportButton} onPress={handleExportMenu}>
          <Ionicons name="download-outline" size={18} color="white" />
          <Text style={styles.actionButtonText}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.importButton} onPress={handleImportMenu}>
          <Ionicons name="cloud-upload-outline" size={18} color="white" />
          <Text style={styles.actionButtonText}>Import</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearMenu}>
          <Ionicons name="trash-outline" size={18} color="white" />
          <Text style={styles.actionButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Edit Item Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Item</Text>
            
            <Text style={styles.label}>Item Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter item name"
            />
            
            <Text style={styles.label}>Price</Text>
            <TextInput
              style={styles.input}
              value={editPrice}
              onChangeText={setEditPrice}
              placeholder="Enter price"
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeEditModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        visible={addItemModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeAddItemModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Item</Text>
            
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCategoryId}
                onValueChange={(itemValue) => setSelectedCategoryId(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select Category" value="" />
                {categories.map(category => (
                  <Picker.Item
                    key={category.id}
                    label={category.category_name}
                    value={category.id.toString()}
                  />
                ))}
              </Picker>
            </View>
            
            <Text style={styles.label}>Item Name</Text>
            <TextInput
              style={styles.input}
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="Enter item name"
            />
            
            <Text style={styles.label}>Price</Text>
            <TextInput
              style={styles.input}
              value={newItemPrice}
              onChangeText={setNewItemPrice}
              placeholder="Enter price"
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeAddItemModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveNewItem}>
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        visible={addCategoryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeAddCategoryModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Category</Text>
            
            <Text style={styles.label}>Category Name</Text>
            <TextInput
              style={styles.input}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Enter category name"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeAddCategoryModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveNewCategory}>
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e7d32',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    flex: 1,
  },
  categoryOrderButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  orderButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#e3f2fd',
  },
  orderButtonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  itemsContainer: {
    paddingLeft: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    flex: 1,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 12,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    marginRight: 10,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#2e7d32',
    borderRadius: 5,
  },
  saveButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  menuActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#388e3c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d32f2f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
})

export default MaintenanceScreen
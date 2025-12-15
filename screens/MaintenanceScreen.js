import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native'
import React, { useState, useEffect, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Picker } from '@react-native-picker/picker'
import databaseService from '../src/services/database'
import menuExportService from '../src/services/menuExportService'

const MaintenanceScreen = ({ navigation }) => {
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

  // Option groups states
  const [allOptionGroups, setAllOptionGroups] = useState([])
  const [selectedOptionGroups, setSelectedOptionGroups] = useState([])
  const [optionGroupsModalVisible, setOptionGroupsModalVisible] = useState(false)

  useEffect(() => {
    loadCategoriesWithItems()
    loadOptionGroups()
  }, [])

  // Reload option groups when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadOptionGroups()
    }, [])
  )

  const loadOptionGroups = async () => {
    try {
      const groups = await databaseService.getOptionGroups()
      setAllOptionGroups(groups)
    } catch (error) {
      console.error('Error loading option groups:', error)
    }
  }

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
  const openEditModal = async (item, categoryId) => {
    setEditingItem({ ...item, categoryId })
    setEditName(item.item_name)
    setEditPrice(item.price.toString())

    // Load linked option groups for this item
    try {
      const linkedGroups = await databaseService.getItemOptionGroups(item.id)
      setSelectedOptionGroups(linkedGroups.map(g => g.id))
    } catch (error) {
      console.error('Error loading item option groups:', error)
      setSelectedOptionGroups([])
    }

    setEditModalVisible(true)
  }

  const closeEditModal = () => {
    setEditModalVisible(false)
    setEditingItem(null)
    setEditName('')
    setEditPrice('')
    setSelectedOptionGroups([])
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

      // Update option group links
      const currentGroups = await databaseService.getItemOptionGroups(editingItem.id)
      const currentGroupIds = currentGroups.map(g => g.id)

      // Remove unselected groups
      for (const groupId of currentGroupIds) {
        if (!selectedOptionGroups.includes(groupId)) {
          await databaseService.unlinkItemFromOptionGroup(editingItem.id, groupId)
        }
      }

      // Add newly selected groups
      for (const groupId of selectedOptionGroups) {
        if (!currentGroupIds.includes(groupId)) {
          await databaseService.linkItemToOptionGroup(editingItem.id, groupId)
        }
      }

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
    setSelectedOptionGroups([])
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
      const itemId = await databaseService.addItem(parseInt(selectedCategoryId), newItemName.trim(), price)

      // Link selected option groups to the new item
      for (const groupId of selectedOptionGroups) {
        await databaseService.linkItemToOptionGroup(itemId, groupId)
      }

      closeAddItemModal()
      await loadCategoriesWithItems()
      Alert.alert('Success', 'Item added successfully')
    } catch (error) {
      console.error('Error adding item:', error)
      Alert.alert('Error', 'Failed to add item')
    }
  }

  // Option groups functions
  const toggleOptionGroup = (groupId) => {
    if (selectedOptionGroups.includes(groupId)) {
      setSelectedOptionGroups(selectedOptionGroups.filter(id => id !== groupId))
    } else {
      setSelectedOptionGroups([...selectedOptionGroups, groupId])
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

  const handleMoveItemUp = async (itemId, categoryId) => {
    try {
      await databaseService.moveItemUp(itemId, categoryId)
      await loadCategoriesWithItems()
    } catch (error) {
      console.error('Error moving item up:', error)
      Alert.alert('Error', 'Failed to reorder item')
    }
  }

  const handleMoveItemDown = async (itemId, categoryId) => {
    try {
      await databaseService.moveItemDown(itemId, categoryId)
      await loadCategoriesWithItems()
    } catch (error) {
      console.error('Error moving item down:', error)
      Alert.alert('Error', 'Failed to reorder item')
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
        {item.items.map((menuItem, itemIndex) => (
          <View key={itemIndex} style={styles.itemRow}>
            <View style={styles.itemOrderButtons}>
              <TouchableOpacity
                style={[styles.itemOrderButton, itemIndex === 0 && styles.orderButtonDisabled]}
                onPress={() => handleMoveItemUp(menuItem.id, item.id)}
                disabled={itemIndex === 0}
              >
                <Ionicons
                  name="chevron-up"
                  size={16}
                  color={itemIndex === 0 ? '#ccc' : '#2563eb'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.itemOrderButton, itemIndex === item.items.length - 1 && styles.orderButtonDisabled]}
                onPress={() => handleMoveItemDown(menuItem.id, item.id)}
                disabled={itemIndex === item.items.length - 1}
              >
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={itemIndex === item.items.length - 1 ? '#ccc' : '#2563eb'}
                />
              </TouchableOpacity>
            </View>
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
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate('Menu')}
            activeOpacity={0.8}
          >
            <Ionicons name="home" size={22} color="#2563eb" />
          </TouchableOpacity>
        </View>
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
        <TouchableOpacity
          style={styles.optionGroupsActionButton}
          onPress={() => navigation.navigate('OptionGroups')}
        >
          <Ionicons name="options-outline" size={18} color="white" />
          <Text style={styles.actionButtonText}>Option Groups</Text>
        </TouchableOpacity>
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

            <TouchableOpacity
              style={styles.optionGroupsButton}
              onPress={() => setOptionGroupsModalVisible(true)}
            >
              <Ionicons name="options-outline" size={20} color="#7c3aed" />
              <Text style={styles.optionGroupsButtonText}>
                Option Groups ({selectedOptionGroups.length} selected)
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

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

            <TouchableOpacity
              style={styles.optionGroupsButton}
              onPress={() => setOptionGroupsModalVisible(true)}
            >
              <Ionicons name="options-outline" size={20} color="#7c3aed" />
              <Text style={styles.optionGroupsButtonText}>
                Option Groups ({selectedOptionGroups.length} selected)
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

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

      {/* Option Groups Selection Modal */}
      <Modal
        visible={optionGroupsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setOptionGroupsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Option Groups</Text>

            {allOptionGroups.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No option groups available</Text>
                <Text style={styles.emptySubtext}>
                  Create option groups in the Option Groups screen first
                </Text>
              </View>
            ) : (
              <View style={styles.optionGroupsList}>
                {allOptionGroups.map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    style={styles.optionGroupItem}
                    onPress={() => toggleOptionGroup(group.id)}
                  >
                    <View style={styles.optionGroupItemLeft}>
                      <View style={[
                        styles.checkbox,
                        selectedOptionGroups.includes(group.id) && styles.checkboxChecked
                      ]}>
                        {selectedOptionGroups.includes(group.id) && (
                          <Ionicons name="checkmark" size={16} color="#ffffff" />
                        )}
                      </View>
                      <View style={styles.optionGroupInfo}>
                        <Text style={styles.optionGroupItemName}>{group.name}</Text>
                        <Text style={styles.optionGroupItemDetail}>
                          {group.choices?.length || 0} choices • {group.selection_type === 'single' ? 'Single' : 'Multiple'} select
                          {group.is_required === 1 && ' • Required'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setOptionGroupsModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 8,
  },
  homeButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 8,
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
  itemOrderButtons: {
    flexDirection: 'row',
    gap: 2,
    marginRight: 8,
  },
  itemOrderButton: {
    padding: 2,
    borderRadius: 3,
    backgroundColor: '#e3f2fd',
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
  optionGroupsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  optionGroupsActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
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
  optionGroupsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  optionGroupsButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '600',
    marginLeft: 8,
  },
  optionGroupsList: {
    maxHeight: 400,
  },
  optionGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  optionGroupItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  optionGroupInfo: {
    flex: 1,
  },
  optionGroupItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  optionGroupItemDetail: {
    fontSize: 12,
    color: '#6b7280',
  },
  closeButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
})

export default MaintenanceScreen
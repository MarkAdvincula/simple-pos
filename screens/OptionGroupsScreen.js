import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import databaseService from '../src/services/database';

const OptionGroupsScreen = ({ navigation }) => {
  const [optionGroups, setOptionGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupRequired, setNewGroupRequired] = useState(false);
  const [newGroupSelectionType, setNewGroupSelectionType] = useState('single');

  // Detail modal states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Add choice states
  const [addChoiceModalVisible, setAddChoiceModalVisible] = useState(false);
  const [newChoiceName, setNewChoiceName] = useState('');
  const [newChoicePrice, setNewChoicePrice] = useState('');

  useEffect(() => {
    loadOptionGroups();
  }, []);

  const loadOptionGroups = async () => {
    try {
      setLoading(true);
      const groups = await databaseService.getOptionGroups();
      setOptionGroups(groups);
    } catch (error) {
      console.error('Error loading option groups:', error);
      Alert.alert('Error', 'Failed to load option groups');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    try {
      await databaseService.addOptionGroup(
        newGroupName.trim(),
        newGroupRequired,
        newGroupSelectionType
      );
      setAddModalVisible(false);
      setNewGroupName('');
      setNewGroupRequired(false);
      setNewGroupSelectionType('single');
      await loadOptionGroups();
      Alert.alert('Success', 'Option group added');
    } catch (error) {
      console.error('Error adding option group:', error);
      Alert.alert('Error', 'Failed to add option group');
    }
  };

  const handleDeleteGroup = (id, name) => {
    Alert.alert(
      'Delete Option Group',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteOptionGroup(id);
              await loadOptionGroups();
            } catch (error) {
              console.error('Error deleting option group:', error);
              Alert.alert('Error', 'Failed to delete option group');
            }
          },
        },
      ]
    );
  };

  const handleViewGroup = (group) => {
    setSelectedGroup(group);
    setDetailModalVisible(true);
  };

  const handleAddChoice = async () => {
    if (!newChoiceName.trim()) {
      Alert.alert('Error', 'Please enter a choice name');
      return;
    }

    const price = parseFloat(newChoicePrice) || 0;

    try {
      await databaseService.addOptionChoice(
        selectedGroup.id,
        newChoiceName.trim(),
        price
      );
      setAddChoiceModalVisible(false);
      setNewChoiceName('');
      setNewChoicePrice('');
      await loadOptionGroups();
      const updatedGroups = await databaseService.getOptionGroups();
      const updated = updatedGroups.find((g) => g.id === selectedGroup.id);
      setSelectedGroup(updated);
      Alert.alert('Success', 'Choice added');
    } catch (error) {
      console.error('Error adding choice:', error);
      Alert.alert('Error', 'Failed to add choice');
    }
  };

  const handleDeleteChoice = (choiceId, choiceName) => {
    Alert.alert(
      'Delete Choice',
      `Are you sure you want to delete "${choiceName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteOptionChoice(choiceId);
              await loadOptionGroups();
              const updatedGroups = await databaseService.getOptionGroups();
              const updated = updatedGroups.find((g) => g.id === selectedGroup.id);
              setSelectedGroup(updated);
              Alert.alert('Success', 'Choice deleted');
            } catch (error) {
              console.error('Error deleting choice:', error);
              Alert.alert('Error', 'Failed to delete choice');
            }
          },
        },
      ]
    );
  };

  const renderOptionGroup = ({ item }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => handleViewGroup(item)}
      activeOpacity={0.7}
    >
      <View style={styles.groupHeader}>
        <View style={styles.groupNameRow}>
          <Text style={styles.groupName}>{item.name}</Text>
          {item.is_required === 1 && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText}>Required</Text>
            </View>
          )}
          <View style={styles.selectionTypeBadge}>
            <Text style={styles.selectionTypeBadgeText}>
              {item.selection_type === 'single' ? 'Single' : 'Multiple'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteGroup(item.id, item.name);
          }}
          style={styles.deleteButton}
        >
          <Ionicons name="trash" size={20} color="#dc2626" />
        </TouchableOpacity>
      </View>
      <View style={styles.groupDetails}>
        <Text style={styles.detailText}>
          {item.choices?.length || 0} choices
        </Text>
        {item.choices?.slice(0, 3).map((choice, idx) => (
          <View key={idx} style={styles.choicePreviewRow}>
            <Text style={styles.choicePreviewName}>
              • {choice.choice_name}
            </Text>
            <Text style={styles.choicePreviewPrice}>
              +₱{parseFloat(choice.price).toFixed(2)}
            </Text>
          </View>
        ))}
        {item.choices?.length > 3 && (
          <Text style={styles.moreText}>
            +{item.choices.length - 3} more choices...
          </Text>
        )}
      </View>
      <View style={styles.tapHint}>
        <Text style={styles.tapHintText}>Tap to manage choices</Text>
        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Option Groups</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {optionGroups.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="options-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Option Groups</Text>
          <Text style={styles.emptyText}>
            Create option groups to add customization options to your menu items
          </Text>
        </View>
      ) : (
        <FlatList
          data={optionGroups}
          renderItem={renderOptionGroup}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Add Group Modal */}
      <Modal
        visible={addModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Option Group</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Sizes, Add-ons"
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus={true}
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Required</Text>
              <Switch
                value={newGroupRequired}
                onValueChange={setNewGroupRequired}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={newGroupRequired ? '#2563eb' : '#f3f4f6'}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Selection Type</Text>
              <View style={styles.selectionTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.selectionTypeButton,
                    newGroupSelectionType === 'single' && styles.selectionTypeButtonActive,
                  ]}
                  onPress={() => setNewGroupSelectionType('single')}
                >
                  <Text
                    style={[
                      styles.selectionTypeButtonText,
                      newGroupSelectionType === 'single' && styles.selectionTypeButtonTextActive,
                    ]}
                  >
                    Single
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.selectionTypeButton,
                    newGroupSelectionType === 'multiple' && styles.selectionTypeButtonActive,
                  ]}
                  onPress={() => setNewGroupSelectionType('multiple')}
                >
                  <Text
                    style={[
                      styles.selectionTypeButtonText,
                      newGroupSelectionType === 'multiple' && styles.selectionTypeButtonTextActive,
                    ]}
                  >
                    Multiple
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setAddModalVisible(false);
                  setNewGroupName('');
                  setNewGroupRequired(false);
                  setNewGroupSelectionType('single');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleAddGroup}
              >
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.detailHeader}>
              <View style={styles.detailHeaderLeft}>
                <TouchableOpacity
                  onPress={() => setDetailModalVisible(false)}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.detailTitle}>{selectedGroup?.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setAddChoiceModalVisible(true)}
              >
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailInfoRow}>
              <View style={styles.detailInfoItem}>
                <Text style={styles.detailInfoLabel}>Selection:</Text>
                <Text style={styles.detailInfoValue}>
                  {selectedGroup?.selection_type === 'single' ? 'Single Choice' : 'Multiple Choices'}
                </Text>
              </View>
              <View style={styles.detailInfoItem}>
                <Text style={styles.detailInfoLabel}>Required:</Text>
                <Text style={styles.detailInfoValue}>
                  {selectedGroup?.is_required === 1 ? 'Yes' : 'No'}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.detailBody}>
              {selectedGroup?.choices?.length === 0 ? (
                <View style={styles.emptyOptions}>
                  <Ionicons name="list-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyOptionsText}>No choices yet</Text>
                  <Text style={styles.emptyOptionsSubtext}>
                    Add choices like "Small", "Medium", "Large", etc.
                  </Text>
                </View>
              ) : (
                selectedGroup?.choices?.map((choice) => (
                  <View key={choice.id} style={styles.choiceCard}>
                    <View style={styles.choiceCardContent}>
                      <Text style={styles.choiceCardName}>
                        {choice.choice_name}
                      </Text>
                      <Text style={styles.choiceCardPrice}>
                        +₱{parseFloat(choice.price).toFixed(2)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        handleDeleteChoice(choice.id, choice.choice_name)
                      }
                      style={styles.smallDeleteButton}
                    >
                      <Ionicons name="trash" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Choice Modal */}
      <Modal
        visible={addChoiceModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddChoiceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Choice</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Small, Medium, Large"
              value={newChoiceName}
              onChangeText={setNewChoiceName}
              autoFocus={true}
            />
            <TextInput
              style={styles.input}
              placeholder="Additional price (e.g., 10)"
              value={newChoicePrice}
              onChangeText={setNewChoicePrice}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setAddChoiceModalVisible(false);
                  setNewChoiceName('');
                  setNewChoicePrice('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleAddChoice}
              >
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 8,
  },
  listContent: {
    padding: 16,
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  groupNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  selectionTypeBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectionTypeBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  deleteButton: {
    padding: 4,
  },
  groupDetails: {
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  choicePreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 12,
  },
  choicePreviewName: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  choicePreviewPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  moreText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    paddingLeft: 12,
    marginTop: 4,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 4,
  },
  tapHintText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: 340,
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  saveButton: {
    backgroundColor: '#2563eb',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#374151',
  },
  selectionTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  selectionTypeButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  selectionTypeButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  selectionTypeButtonTextActive: {
    color: '#ffffff',
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  detailModalContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  detailInfoRow: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 24,
  },
  detailInfoItem: {
    flex: 1,
  },
  detailInfoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  detailBody: {
    flex: 1,
    padding: 16,
  },
  emptyOptions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyOptionsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
  },
  emptyOptionsSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  choiceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  choiceCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 8,
  },
  choiceCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  choiceCardPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  requiredBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  smallDeleteButton: {
    padding: 4,
  },
});

export default OptionGroupsScreen;

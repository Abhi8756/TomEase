import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { MapPin, Plus, Bell } from 'lucide-react-native';
import api from '../services/api';
import { useStore } from '../store';

export default function PlotsScreen() {
  const [plots, setPlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPlotName, setNewPlotName] = useState('');
  
  // Default to a central location (e.g., center of US or user's locale)
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    fetchPlots();
  }, []);

  const fetchPlots = async () => {
    try {
      const res = await api.get('/plots/');
      setPlots(res.data);
      if (res.data.length > 0 && res.data[0].latitude) {
        setRegion({
          ...region,
          latitude: res.data[0].latitude,
          longitude: res.data[0].longitude,
        });
      }
    } catch (error) {
      console.error('Failed to fetch plots', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlot = async () => {
    if (!newPlotName.trim()) {
      Alert.alert('Error', 'Please enter a plot name');
      return;
    }
    
    try {
      await api.post('/plots/', {
        name: newPlotName,
        latitude: region.latitude,
        longitude: region.longitude
      });
      setModalVisible(false);
      setNewPlotName('');
      fetchPlots();
    } catch (error) {
      Alert.alert('Error', 'Failed to create plot');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          region={region}
          onRegionChangeComplete={setRegion}
        >
          {plots.map(plot => (
            plot.latitude && plot.longitude ? (
              <Marker
                key={plot.id}
                coordinate={{ latitude: plot.latitude, longitude: plot.longitude }}
                title={plot.name}
                description="Tomato Field"
              />
            ) : null
          ))}
        </MapView>
        
        {/* Center Crosshair for adding new plots */}
        <View style={styles.crosshair} pointerEvents="none">
          <MapPin size={32} color="#10b981" />
        </View>

        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Your Plots</Text>
        {loading ? (
          <ActivityIndicator color="#10b981" />
        ) : (
          <FlatList
            data={plots}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.plotCard}>
                <View>
                  <Text style={styles.plotName}>{item.name}</Text>
                  <Text style={styles.plotCoords}>
                    {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                  </Text>
                </View>
                <TouchableOpacity style={styles.alertButton}>
                  <Bell size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No plots found. Add one using the map above!</Text>
            }
          />
        )}
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Plot</Text>
            <Text style={styles.modalDesc}>
              This will create a plot at the current map center location.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Plot Name (e.g., North Field)"
              placeholderTextColor="#9ca3af"
              value={newPlotName}
              onChangeText={setNewPlotName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddPlot}>
                <Text style={styles.saveText}>Save Plot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  mapContainer: {
    height: '50%',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  crosshair: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#10b981',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  listContainer: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  plotCard: {
    backgroundColor: '#1f2937',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plotName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  plotCoords: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  alertButton: {
    padding: 8,
  },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    padding: 20,
    borderRadius: 12,
    width: '80%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalDesc: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#374151',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: 10,
    marginRight: 10,
  },
  cancelText: {
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#10b981',
    padding: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});

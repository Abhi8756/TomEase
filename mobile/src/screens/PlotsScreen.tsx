import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, Modal, TextInput, ScrollView, Image
} from 'react-native';
import * as Location from 'expo-location';
import { MapPin, Plus, X, ChevronRight, Navigation } from 'lucide-react-native';
import api from '../services/api';
import { getDiseaseColor } from '../services/utils';

export default function PlotsScreen() {
  const [plots, setPlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPlotName, setNewPlotName] = useState('');
  const [newPlotLat, setNewPlotLat] = useState('');
  const [newPlotLon, setNewPlotLon] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  const [selectedPlot, setSelectedPlot] = useState<any | null>(null);
  const [plotScans, setPlotScans] = useState<any[]>([]);
  const [plotScansLoading, setPlotScansLoading] = useState(false);
  const [plotMembers, setPlotMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [activeTab, setActiveTab] = useState<'scans' | 'members' | 'weather'>('scans');
  const [weather, setWeather] = useState<any | null>(null);
  const [ndvi, setNdvi] = useState<any | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => { fetchPlots(); }, []);

  const fetchPlots = async () => {
    try {
      const res = await api.get('/plots/');
      setPlots(res.data);
    } catch {
      Alert.alert('Error', 'Failed to fetch plots');
    } finally {
      setLoading(false);
    }
  };

  const getGpsLocation = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is needed to pin a plot.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setNewPlotLat(loc.coords.latitude.toFixed(6));
      setNewPlotLon(loc.coords.longitude.toFixed(6));
    } catch {
      Alert.alert('Error', 'Could not get location');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleAddPlot = async () => {
    if (!newPlotName.trim()) {
      Alert.alert('Error', 'Plot name is required');
      return;
    }
    try {
      await api.post('/plots/', {
        name: newPlotName.trim(),
        latitude: newPlotLat ? parseFloat(newPlotLat) : null,
        longitude: newPlotLon ? parseFloat(newPlotLon) : null,
      });
      setModalVisible(false);
      setNewPlotName('');
      setNewPlotLat('');
      setNewPlotLon('');
      fetchPlots();
    } catch {
      Alert.alert('Error', 'Failed to create plot');
    }
  };

  const openPlotDetail = async (plot: any) => {
    setSelectedPlot(plot);
    setActiveTab('scans');
    setWeather(null);
    setNdvi(null);
    setPlotScansLoading(true);
    try {
      const [detailRes, membersRes] = await Promise.all([
        api.get(`/plots/${plot.id}`),
        api.get(`/plots/${plot.id}/members`),
      ]);
      setPlotScans(detailRes.data.scans || []);
      setPlotMembers(membersRes.data || []);
    } catch {
      setPlotScans([]);
      setPlotMembers([]);
    } finally {
      setPlotScansLoading(false);
    }
  };

  const fetchWeatherAndNdvi = async (plot: any) => {
    if (!plot.latitude || !plot.longitude) {
      Alert.alert('No GPS', 'This plot has no GPS coordinates. Edit the plot and use "Use My GPS" to set them.');
      return;
    }
    setWeatherLoading(true);
    try {
      const [weatherRes, ndviRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${plot.latitude}&longitude=${plot.longitude}&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m,weather_code,apparent_temperature&wind_speed_unit=kmh`),
        api.get(`/plots/${plot.id}/ndvi`),
      ]);
      const weatherData = await weatherRes.json();
      setWeather(weatherData.current);
      setNdvi(ndviRes.data);
    } catch {
      Alert.alert('Error', 'Failed to fetch weather/NDVI data');
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedPlot) return;
    setIsInviting(true);
    try {
      await api.post(`/plots/${selectedPlot.id}/members`, { email: inviteEmail.trim() });
      setInviteEmail('');
      const res = await api.get(`/plots/${selectedPlot.id}/members`);
      setPlotMembers(res.data || []);
      Alert.alert('Success', 'Invitation sent!');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Plot List */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>My Plots</Text>
          <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={plots}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.plotCard} onPress={() => openPlotDetail(item)}>
                <View style={styles.plotIconWrap}>
                  <MapPin size={20} color="#10b981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.plotName}>{item.name}</Text>
                  <Text style={styles.plotCoords}>
                    {item.latitude ? `📍 ${parseFloat(item.latitude).toFixed(4)}, ${parseFloat(item.longitude).toFixed(4)}` : '📍 No GPS set'}
                  </Text>
                </View>
                <ChevronRight size={18} color="#6b7280" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🌱</Text>
                <Text style={styles.emptyText}>No plots yet.</Text>
                <Text style={styles.emptySubText}>Tap + to add your first plot</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      {/* Add Plot Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>New Plot</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Plot name (e.g. North Field)"
              placeholderTextColor="#9ca3af"
              value={newPlotName}
              onChangeText={setNewPlotName}
            />

            <TouchableOpacity style={styles.gpsButton} onPress={getGpsLocation} disabled={gpsLoading}>
              {gpsLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Navigation size={16} color="#fff" />
                  <Text style={styles.gpsButtonText}>Use My GPS Location</Text>
                </>
              )}
            </TouchableOpacity>

            {(newPlotLat || newPlotLon) && (
              <Text style={styles.coordPreview}>📍 {newPlotLat}, {newPlotLon}</Text>
            )}

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

      {/* Plot Detail Modal */}
      <Modal visible={!!selectedPlot} animationType="slide" onRequestClose={() => setSelectedPlot(null)}>
        {selectedPlot && (
          <View style={{ flex: 1, backgroundColor: '#111827' }}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{selectedPlot.name}</Text>
              <TouchableOpacity onPress={() => setSelectedPlot(null)}>
                <X size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.plotDetailCoords}>
              {selectedPlot.latitude
                ? `📍 ${parseFloat(selectedPlot.latitude).toFixed(5)}, ${parseFloat(selectedPlot.longitude).toFixed(5)}`
                : '📍 No GPS coordinates set'}
            </Text>

            {/* Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity style={[styles.tab, activeTab === 'scans' && styles.tabActive]} onPress={() => setActiveTab('scans')}>
                <Text style={[styles.tabText, activeTab === 'scans' && styles.tabTextActive]}>Scans</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, activeTab === 'members' && styles.tabActive]} onPress={() => setActiveTab('members')}>
                <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>Team</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'weather' && styles.tabActive]}
                onPress={() => { setActiveTab('weather'); if (!weather && selectedPlot) fetchWeatherAndNdvi(selectedPlot); }}
              >
                <Text style={[styles.tabText, activeTab === 'weather' && styles.tabTextActive]}>🌤 Field</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 16 }}>
              {activeTab === 'scans' && (
                <>
                  {plotScansLoading ? (
                    <ActivityIndicator color="#10b981" />
                  ) : plotScans.length === 0 ? (
                    <Text style={styles.noItemsText}>No scans recorded for this plot yet.</Text>
                  ) : (
                    plotScans.map((scan) => (
                      <View key={scan.scan_id} style={styles.scanCard}>
                        <View style={[styles.diseaseDot, { backgroundColor: getDiseaseColor(scan.disease) }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.scanDisease, { color: getDiseaseColor(scan.disease) }]}>
                            {scan.disease.replace(/_/g, ' ')}
                          </Text>
                          <Text style={styles.scanMeta}>
                            {(scan.confidence * 100).toFixed(1)}% · {new Date(scan.timestamp).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </>
              )}

              {activeTab === 'members' && (
                <>
                  <View style={styles.inviteRow}>
                    <TextInput
                      style={styles.inviteInput}
                      placeholder="Invite by email..."
                      placeholderTextColor="#9ca3af"
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.inviteButton} onPress={handleInviteMember} disabled={isInviting}>
                      {isInviting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.inviteButtonText}>Invite</Text>}
                    </TouchableOpacity>
                  </View>
                  {plotMembers.length === 0 ? (
                    <Text style={styles.noItemsText}>No team members yet.</Text>
                  ) : (
                    plotMembers.map((m, i) => (
                      <View key={i} style={styles.memberCard}>
                        <Text style={styles.memberName}>{m.name || m.email}</Text>
                        <Text style={styles.memberRole}>{m.role}</Text>
                      </View>
                    ))
                  )}
                </>
              )}

              {activeTab === 'weather' && (
                <>
                  {weatherLoading ? (
                    <ActivityIndicator color="#10b981" style={{ marginTop: 30 }} />
                  ) : !weather ? (
                    <Text style={styles.noItemsText}>Tap the Field tab to load weather & NDVI.</Text>
                  ) : (
                    <>
                      <Text style={styles.sectionLabel}>🌡️ Hyperlocal Weather</Text>
                      <View style={styles.weatherGrid}>
                        {[
                          { label: 'Temperature', value: `${weather.temperature_2m?.toFixed(1)}°C` },
                          { label: 'Feels Like', value: `${weather.apparent_temperature?.toFixed(1)}°C` },
                          { label: 'Humidity', value: `${weather.relative_humidity_2m}%` },
                          { label: 'Wind', value: `${weather.wind_speed_10m} km/h` },
                          { label: 'Rain', value: `${weather.rain ?? 0} mm` },
                        ].map((item) => (
                          <View key={item.label} style={styles.weatherCard}>
                            <Text style={styles.weatherValue}>{item.value}</Text>
                            <Text style={styles.weatherLabel}>{item.label}</Text>
                          </View>
                        ))}
                      </View>

                      {ndvi && (
                        <>
                          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>🛰️ NDVI Satellite Map</Text>
                          {ndvi.mocked && (
                            <Text style={styles.ndviDemo}>⚠️ Demo mode — set AGROMONITORING_API_KEY for live data</Text>
                          )}
                          <Image source={{ uri: ndvi.image_url }} style={styles.ndviImage} resizeMode="contain" />
                          <Text style={styles.ndviDesc}>{ndvi.description}</Text>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  listContainer: { flex: 1, padding: 16 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: '#10b981', fontSize: 22, fontWeight: 'bold' },
  fab: {
    backgroundColor: '#10b981', width: 44, height: 44,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },
  plotCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1f2937', borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  plotIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#064e3b', justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  plotName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  plotCoords: { color: '#9ca3af', fontSize: 12, marginTop: 3 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  emptySubText: { color: '#9ca3af', marginTop: 6 },

  // Add plot modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1f2937', padding: 20, borderRadius: 16, width: '85%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  input: {
    backgroundColor: '#374151', color: '#fff',
    padding: 12, borderRadius: 8, marginBottom: 12,
  },
  gpsButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#10b981', padding: 12, borderRadius: 8, marginBottom: 10,
    gap: 8,
  },
  gpsButtonText: { color: '#fff', fontWeight: 'bold' },
  coordPreview: { color: '#10b981', fontSize: 12, marginBottom: 12, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelButton: { padding: 10, marginRight: 10 },
  cancelText: { color: '#9ca3af', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#10b981', padding: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveText: { color: '#fff', fontWeight: 'bold' },

  // Detail modal
  detailHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#1f2937',
    borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  detailTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 12 },
  plotDetailCoords: { color: '#9ca3af', fontSize: 13, paddingHorizontal: 16, paddingTop: 10 },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16,
    marginVertical: 12, backgroundColor: '#374151',
    borderRadius: 8, padding: 3,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: '#10b981' },
  tabText: { color: '#9ca3af', fontWeight: 'bold', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  noItemsText: { color: '#6b7280', textAlign: 'center', marginTop: 30 },
  scanCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1f2937', borderRadius: 8,
    padding: 12, marginBottom: 8,
  },
  diseaseDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  scanDisease: { fontSize: 15, fontWeight: 'bold' },
  scanMeta: { color: '#9ca3af', fontSize: 12, marginTop: 3 },
  inviteRow: { flexDirection: 'row', marginBottom: 12 },
  inviteInput: {
    flex: 1, backgroundColor: '#374151', color: '#fff',
    borderRadius: 8, padding: 10, marginRight: 8,
  },
  inviteButton: {
    backgroundColor: '#10b981', borderRadius: 8,
    paddingHorizontal: 14, justifyContent: 'center',
  },
  inviteButtonText: { color: '#fff', fontWeight: 'bold' },
  memberCard: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: '#1f2937',
    borderRadius: 8, padding: 12, marginBottom: 8,
  },
  memberName: { color: '#fff', fontSize: 15 },
  memberRole: { color: '#10b981', fontSize: 12, textTransform: 'capitalize', fontWeight: 'bold' },
  sectionLabel: { color: '#10b981', fontWeight: 'bold', fontSize: 15, marginBottom: 12 },
  weatherGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  weatherCard: {
    backgroundColor: '#1f2937', borderRadius: 10,
    padding: 14, alignItems: 'center', minWidth: '28%', flex: 1,
  },
  weatherValue: { color: '#10b981', fontSize: 20, fontWeight: 'bold' },
  weatherLabel: { color: '#9ca3af', fontSize: 11, marginTop: 4, textAlign: 'center' },
  ndviImage: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#1f2937', marginTop: 10 },
  ndviDesc: { color: '#9ca3af', fontSize: 12, marginTop: 8, lineHeight: 18 },
  ndviDemo: { color: '#f59e0b', fontSize: 12, marginBottom: 6 },
});

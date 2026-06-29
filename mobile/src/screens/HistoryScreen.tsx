import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { getRecentScans, getDiseaseStats, deleteScan, Scan } from '../services/database';

export default function HistoryScreen({ navigation }: any) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [stats, setStats] = useState<{ disease: string; count: number }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const recentScans = await getRecentScans(50);
    const diseaseStats = await getDiseaseStats();
    setScans(recentScans);
    setStats(diseaseStats);
  };

  const handleDelete = (scan_id: string) => {
    Alert.alert(
      'Delete Scan',
      'Are you sure you want to delete this scan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteScan(scan_id);
            loadData();
          },
        },
      ]
    );
  };

  const getDiseaseColor = (disease: string) => {
    if (disease === 'Healthy') return '#10b981';
    if (disease === 'TYLCV') return '#ef4444';
    return '#f59e0b';
  };

  const renderScanItem = ({ item }: { item: Scan }) => (
    <TouchableOpacity 
      style={styles.scanCard}
      onLongPress={() => handleDelete(item.scan_id)}
    >
      <Image source={{ uri: item.gradcam_url }} style={styles.thumbnail} />
      
      <View style={styles.scanInfo}>
        <Text style={[styles.diseaseName, { color: getDiseaseColor(item.disease) }]}>
          {item.disease.replace(/_/g, ' ')}
        </Text>
        <Text style={styles.confidence}>
          {(item.confidence * 100).toFixed(1)}% confidence
        </Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>

      <View style={[styles.statusDot, { backgroundColor: getDiseaseColor(item.disease) }]} />
    </TouchableOpacity>
  );

  const renderStatsItem = ({ item }: { item: { disease: string; count: number } }) => (
    <View style={styles.statsCard}>
      <View style={[styles.statsIcon, { backgroundColor: getDiseaseColor(item.disease) }]}>
        <Text style={styles.statsCount}>{item.count}</Text>
      </View>
      <Text style={styles.statsDisease}>{item.disease.replace(/_/g, ' ')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Statistics */}
      {stats.length > 0 && (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Disease Summary</Text>
          <FlatList
            data={stats}
            renderItem={renderStatsItem}
            keyExtractor={(item) => item.disease}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsList}
          />
        </View>
      )}

      {/* History List */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Recent Scans ({scans.length})</Text>
        
        {scans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📸</Text>
            <Text style={styles.emptyText}>No scans yet</Text>
            <Text style={styles.emptySubtext}>
              Start scanning leaves to track disease history
            </Text>
          </View>
        ) : (
          <FlatList
            data={scans}
            renderItem={renderScanItem}
            keyExtractor={(item) => item.scan_id}
            contentContainerStyle={styles.scansList}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  statsSection: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingHorizontal: 20,
    color: '#1f2937',
  },
  statsList: {
    paddingHorizontal: 15,
  },
  statsCard: {
    alignItems: 'center',
    marginHorizontal: 10,
    minWidth: 100,
  },
  statsIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsCount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsDisease: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  historySection: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  scansList: {
    paddingHorizontal: 20,
  },
  scanCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  scanInfo: {
    flex: 1,
    marginLeft: 15,
  },
  diseaseName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  confidence: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 11,
    color: '#9ca3af',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

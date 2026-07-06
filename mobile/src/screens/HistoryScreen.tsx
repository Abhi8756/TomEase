import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import api from '../services/api';

export default function HistoryScreen() {
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/recent-scans');
      setScans(res.data.scans || []);
    } catch (error) {
      console.error('Failed to fetch scans', error);
    } finally {
      setLoading(false);
    }
  };

  const getDiseaseColor = (disease: string) => {
    if (disease === 'Healthy') return '#10b981';
    if (disease === 'TYLCV') return '#ef4444';
    return '#f59e0b';
  };

  const getImageUrl = (url: string) => {
    if (url?.startsWith('http')) return url;
    return `http://localhost:8080${url}`;
  };

  const renderScanItem = ({ item }: { item: any }) => (
    <View style={styles.scanCard}>
      <Image source={{ uri: getImageUrl(item.gradcam_url) }} style={styles.thumbnail} />
      
      <View style={styles.scanInfo}>
        <Text style={[styles.diseaseName, { color: getDiseaseColor(item.disease) }]}>
          {item.disease.replace(/_/g, ' ')}
        </Text>
        <Text style={styles.confidence}>
          {(item.confidence * 100).toFixed(1)}% confidence
        </Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleDateString()}
        </Text>
      </View>
      <View style={[styles.statusDot, { backgroundColor: getDiseaseColor(item.disease) }]} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Global Scan Analytics</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#10b981" />
        ) : scans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📸</Text>
            <Text style={styles.emptyText}>No scans found</Text>
          </View>
        ) : (
          <FlatList
            data={scans}
            renderItem={renderScanItem}
            keyExtractor={(item) => item.scan_id || Math.random().toString()}
            contentContainerStyle={styles.scansList}
            refreshing={loading}
            onRefresh={loadData}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingHorizontal: 20,
    color: '#10b981',
  },
  historySection: {
    flex: 1,
    paddingTop: 20,
  },
  scansList: {
    paddingHorizontal: 20,
  },
  scanCard: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  scanInfo: {
    flex: 1,
    marginLeft: 15,
  },
  diseaseName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  confidence: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

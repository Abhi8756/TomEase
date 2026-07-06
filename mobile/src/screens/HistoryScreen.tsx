import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { ChevronRight, X } from 'lucide-react-native';
import api from '../services/api';
import { getImageUrl, getDiseaseColor } from '../services/utils';

export default function HistoryScreen() {
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<any | null>(null);

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

  const renderScanItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.scanCard} onPress={() => setSelectedScan(item)}>
      <Image
        source={{ uri: getImageUrl(item.image_uri || item.image_url) }}
        style={styles.thumbnail}
      />
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
      <ChevronRight size={20} color="#6b7280" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Scan History</Text>

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

      {/* Scan Detail Modal */}
      <Modal visible={!!selectedScan} animationType="slide" onRequestClose={() => setSelectedScan(null)}>
        {selectedScan && (
          <ScrollView style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedScan(null)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Scan Detail</Text>

            {/* Original Image */}
            <Text style={styles.modalLabel}>Original Photo</Text>
            <Image
              source={{ uri: getImageUrl(selectedScan.image_uri || selectedScan.image_url) }}
              style={styles.detailImage}
              resizeMode="contain"
            />

            {/* GradCAM Heatmap */}
            <Text style={styles.modalLabel}>Disease Heatmap</Text>
            <Image
              source={{ uri: getImageUrl(selectedScan.gradcam_url) }}
              style={styles.detailImage}
              resizeMode="contain"
            />

            {/* Diagnosis */}
            <View style={[styles.diagnosisCard, { borderColor: getDiseaseColor(selectedScan.disease) }]}>
              <Text style={styles.modalLabel}>Diagnosis</Text>
              <Text style={[styles.diagnosisText, { color: getDiseaseColor(selectedScan.disease) }]}>
                {selectedScan.disease.replace(/_/g, ' ')}
              </Text>
              <Text style={styles.confidenceText}>
                Confidence: {(selectedScan.confidence * 100).toFixed(1)}%
              </Text>
              <Text style={styles.timestampText}>
                Scanned: {new Date(selectedScan.timestamp).toLocaleString()}
              </Text>
            </View>

            {/* Recommendations */}
            {selectedScan.recommendations?.length > 0 && (
              <View style={styles.recommendationsCard}>
                <Text style={styles.modalLabel}>Treatment Recommendations</Text>
                {selectedScan.recommendations.map((rec: string, i: number) => (
                  <Text key={i} style={styles.recItem}>• {rec}</Text>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  historySection: { flex: 1, paddingTop: 20 },
  sectionTitle: {
    fontSize: 20, fontWeight: 'bold',
    marginBottom: 15, paddingHorizontal: 20,
    color: '#10b981',
  },
  scansList: { paddingHorizontal: 15 },
  scanCard: {
    flexDirection: 'row', backgroundColor: '#1f2937',
    borderRadius: 12, padding: 12, marginBottom: 10,
    alignItems: 'center',
  },
  thumbnail: {
    width: 64, height: 64, borderRadius: 8,
    backgroundColor: '#374151',
  },
  scanInfo: { flex: 1, marginLeft: 12 },
  diseaseName: { fontSize: 16, fontWeight: 'bold' },
  confidence: { color: '#9ca3af', fontSize: 13, marginTop: 3 },
  timestamp: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#111827', padding: 20 },
  closeButton: {
    alignSelf: 'flex-end', padding: 8,
    backgroundColor: '#374151', borderRadius: 20, marginBottom: 10,
  },
  modalTitle: {
    color: '#10b981', fontSize: 22, fontWeight: 'bold', marginBottom: 20,
  },
  modalLabel: { color: '#9ca3af', fontSize: 13, marginBottom: 8, marginTop: 16 },
  detailImage: {
    width: '100%', height: 220, borderRadius: 10,
    backgroundColor: '#1f2937',
  },
  diagnosisCard: {
    marginTop: 16, padding: 16, borderRadius: 10,
    backgroundColor: '#1f2937', borderWidth: 1,
  },
  diagnosisText: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  confidenceText: { color: '#d1d5db', fontSize: 14, marginBottom: 4 },
  timestampText: { color: '#9ca3af', fontSize: 12 },
  recommendationsCard: {
    marginTop: 16, padding: 16, borderRadius: 10,
    backgroundColor: '#1f2937', marginBottom: 40,
  },
  recItem: { color: '#d1d5db', fontSize: 14, marginBottom: 6 },
});

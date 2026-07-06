import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

export default function ResultScreen({ route, navigation }: any) {
  const { result } = route.params;

  const getDiseaseColor = (disease: string) => {
    if (disease === 'Healthy') return '#10b981';
    if (disease === 'TYLCV') return '#ef4444';
    return '#f59e0b';
  };

  const getSeverityLabel = (confidence: number) => {
    if (confidence > 0.9) return 'High Confidence';
    if (confidence > 0.7) return 'Moderate Confidence';
    return 'Low Confidence';
  };

  const getImageUrl = (url: string) => {
    if (url?.startsWith('http')) return url;
    return `http://localhost:8080${url}`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* GradCAM Visualization */}
      <View style={styles.imageSection}>
        <Text style={styles.sectionTitle}>Detection Heatmap</Text>
        <Image 
          source={{ uri: getImageUrl(result.gradcam_url) }} 
          style={styles.gradcamImage}
          resizeMode="contain"
        />
        <Text style={styles.heatmapHint}>
          Red areas show where the disease was detected
        </Text>
      </View>

      {/* Diagnosis */}
      <View style={styles.diagnosisSection}>
        <View style={[styles.diseaseCard, { borderColor: getDiseaseColor(result.disease) }]}>
          <Text style={styles.diagnosisLabel}>Diagnosis</Text>
          <Text style={[styles.diseaseName, { color: getDiseaseColor(result.disease) }]}>
            {result.disease.replace(/_/g, ' ')}
          </Text>
          
          <View style={styles.confidenceBar}>
            <View 
              style={[
                styles.confidenceFill, 
                { 
                  width: `${result.confidence_calibrated * 100}%`,
                  backgroundColor: getDiseaseColor(result.disease)
                }
              ]} 
            />
          </View>
          
          <Text style={styles.confidenceText}>
            {(result.confidence_calibrated * 100).toFixed(1)}% - {getSeverityLabel(result.confidence_calibrated)}
          </Text>
        </View>
      </View>

      {/* Warning if exists */}
      {result.warning && (
        <View style={styles.warningBox}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>{result.warning}</Text>
        </View>
      )}

      {/* Recommendations */}
      <View style={styles.recommendationsSection}>
        <Text style={styles.sectionTitle}>Treatment Recommendations</Text>
        {result.recommendations.map((rec: string, index: number) => (
          <View key={index} style={styles.recommendationItem}>
            <Text style={styles.recommendationBullet}>•</Text>
            <Text style={styles.recommendationText}>{rec}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.actionButtonText}>View History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => navigation.navigate('Scan')}
        >
          <Text style={[styles.actionButtonText, { color: '#fff' }]}>
            Scan Another
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Scan ID: {result.scan_id.slice(0, 8)}
        </Text>
        <Text style={styles.footerText}>
          {new Date(result.timestamp).toLocaleString()}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  imageSection: {
    backgroundColor: '#1f2937',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#10b981',
  },
  gradcamImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
  },
  heatmapHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  diagnosisSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  diseaseCard: {
    borderWidth: 3,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  diagnosisLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
  diseaseName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  confidenceBar: {
    width: '100%',
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  confidenceFill: {
    height: '100%',
  },
  confidenceText: {
    fontSize: 14,
    color: '#6b7280',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  warningText: {
    flex: 1,
    color: '#92400e',
    fontSize: 14,
  },
  recommendationsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  recommendationBullet: {
    fontSize: 20,
    marginRight: 10,
    color: '#10b981',
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionsSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { getImageUrl, getDiseaseColor, getSeverityLabel } from '../services/utils';

export default function ResultScreen({ route, navigation }: any) {
  const { result } = route.params;
  const [showGradcam, setShowGradcam] = useState(true);

  const isHealthy = result.disease === 'Healthy';

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diagnosis Result</Text>
      </View>

      {/* GradCAM/Image */}
      <View style={styles.imageSection}>
        <Image 
          source={{ uri: getImageUrl(result.gradcam_url) }} 
          style={styles.gradcamImage}
          resizeMode="contain"
        />
        <Text style={styles.imageHint}>
          {showGradcam ? '🔥 Red areas show detected disease' : '📷 Original leaf image'}
        </Text>
      </View>

      {/* Diagnosis Card */}
      <View style={styles.diagnosisCard}>
        <Text style={styles.label}>DIAGNOSIS</Text>
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
          {(result.confidence_calibrated * 100).toFixed(1)}% Confidence
        </Text>

        {result.severity && (
          <Text style={styles.severity}>Severity: {result.severity}</Text>
        )}
      </View>

      {/* Warning */}
      {result.warning && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>⚠️ {result.warning}</Text>
        </View>
      )}

      {/* Recommendations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Quick Actions</Text>
        {result.recommendations?.map((rec: string, idx: number) => (
          <View key={idx} style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{rec}</Text>
          </View>
        ))}
      </View>

      {/* RAG Data - Only show if not Healthy */}
      {!isHealthy && (
        <>
          {/* Cause */}
          {result.cause && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🐛 Cause & Symptoms</Text>
              <Text style={styles.contentText}>{result.cause}</Text>
            </View>
          )}

          {/* Prevention */}
          {result.prevention && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🛡️ Prevention</Text>
              {Array.isArray(result.prevention) ? (
                result.prevention.map((item: string, idx: number) => (
                  <View key={idx} style={styles.bulletItem}>
                    <Text style={styles.bullet}>✓</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.contentText}>{result.prevention}</Text>
              )}
            </View>
          )}

          {/* Natural Remedies */}
          {result.remedy_natural && result.remedy_natural.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌿 Natural Treatment</Text>
              {Array.isArray(result.remedy_natural) ? (
                result.remedy_natural.map((item: string, idx: number) => (
                  <View key={idx} style={styles.bulletItem}>
                    <Text style={styles.bullet}>🌱</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.contentText}>{result.remedy_natural}</Text>
              )}
            </View>
          )}

          {/* Chemical Remedies */}
          {result.remedy_chemical && result.remedy_chemical.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💧 Chemical Treatment</Text>
              {Array.isArray(result.remedy_chemical) ? (
                result.remedy_chemical.map((item: string, idx: number) => (
                  <View key={idx} style={styles.bulletItem}>
                    <Text style={styles.bullet}>⚗️</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.contentText}>{result.remedy_chemical}</Text>
              )}
            </View>
          )}

          {/* Sources */}
          {result.sources && result.sources.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📚 Evidence Sources</Text>
              {result.sources.map((src: any, idx: number) => (
                <View key={idx} style={styles.sourceItem}>
                  <Text style={styles.sourceId}>{src.id}</Text>
                  <View style={styles.sourceContent}>
                    <Text style={styles.sourceCitation}>{src.citation}</Text>
                    {src.page && src.page !== 'N/A' && (
                      <Text style={styles.sourcePage}>Page {src.page}</Text>
                    )}
                  </View>
                </View>
              ))}
              {result.confidence_note && (
                <Text style={styles.confidenceNote}>{result.confidence_note}</Text>
              )}
            </View>
          )}
        </>
      )}

      {/* Actions */}
      <View style={styles.actionSection}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Scan')}
        >
          <Text style={styles.actionButtonText}>🔄 Scan Again</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={[styles.actionButtonText, styles.primaryButtonText]}>📋 History</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>ID: {result.scan_id.slice(0, 8)}</Text>
        <Text style={styles.footerText}>{new Date(result.timestamp).toLocaleDateString()}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
  },
  backButton: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  imageSection: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  gradcamImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#000',
  },
  imageHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 8,
  },
  diagnosisCard: {
    marginHorizontal: 12,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  label: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  diseaseName: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 13,
    color: '#d1d5db',
    fontWeight: '500',
  },
  severity: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  warningBox: {
    marginHorizontal: 12,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#7c2d12',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
  },
  warningText: {
    fontSize: 13,
    color: '#fed7aa',
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 12,
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#1e293b',
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 12,
  },
  contentText: {
    fontSize: 13,
    color: '#d1d5db',
    lineHeight: 20,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
  },
  bullet: {
    fontSize: 16,
    marginRight: 10,
    color: '#10b981',
    fontWeight: 'bold',
    minWidth: 24,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#d1d5db',
    lineHeight: 20,
  },
  sourceItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sourceId: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#f59e0b',
    color: '#000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 8,
    marginTop: 2,
  },
  sourceContent: {
    flex: 1,
  },
  sourceCitation: {
    fontSize: 12,
    color: '#e5e7eb',
    fontWeight: '500',
    marginBottom: 2,
  },
  sourcePage: {
    fontSize: 11,
    color: '#9ca3af',
  },
  confidenceNote: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  actionSection: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  primaryButtonText: {
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginHorizontal: 12,
  },
  footerText: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
  },
});

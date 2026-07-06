import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { MapPin, ChevronDown } from 'lucide-react-native';
import { predictDisease } from '../services/api';
import api from '../services/api';

export default function CameraScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [plots, setPlots] = useState<any[]>([]);
  const [selectedPlot, setSelectedPlot] = useState<any | null>(null);
  const [plotPickerVisible, setPlotPickerVisible] = useState(false);

  useEffect(() => {
    api.get('/plots/').then(res => setPlots(res.data)).catch(() => {});
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo) setCapturedImage(photo.uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',       // ← fixed deprecation warning
      allowsEditing: false,        // ← disabled forced cropping
      quality: 0.85,
    });

    if (!result.canceled) {
      setCapturedImage(result.assets[0].uri);
    }
  };

  const analyzePicture = async () => {
    if (!capturedImage) return;
    setLoading(true);
    try {
      const result = await predictDisease(capturedImage, selectedPlot?.id);
      
      if (!result.is_reliable) {
        Alert.alert(
          'Image Quality Warning',
          result.warning || 'Please retake the photo',
          [
            { text: 'Retake', onPress: () => setCapturedImage(null) },
            { text: 'Continue Anyway', onPress: () => navigateToResult(result) }
          ]
        );
      } else {
        navigateToResult(result);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to analyze image');
    } finally {
      setLoading(false);
    }
  };

  const navigateToResult = (result: any) => {
    navigation.navigate('Result', { result, imageUri: capturedImage });
  };

  if (!permission) {
    return <View style={styles.container}><Text style={{color:'#fff'}}>Requesting camera permission...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{color:'#fff', textAlign:'center', margin:20}}>Camera access is required to scan leaves.</Text>
        <TouchableOpacity style={{backgroundColor:'#10b981', padding:15, borderRadius:10, margin:20}} onPress={requestPermission}>
          <Text style={{color:'#fff', textAlign:'center', fontWeight:'bold'}}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {capturedImage ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.preview} resizeMode="contain" />
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingText}>Analyzing leaf...</Text>
            </View>
          ) : (
            <>
              {/* Plot Picker */}
              {plots.length > 0 && (
                <TouchableOpacity
                  style={styles.plotPicker}
                  onPress={() => setPlotPickerVisible(true)}
                >
                  <MapPin size={16} color="#10b981" />
                  <Text style={styles.plotPickerText}>
                    {selectedPlot ? selectedPlot.name : 'Link to a plot (optional)'}
                  </Text>
                  <ChevronDown size={16} color="#9ca3af" />
                </TouchableOpacity>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.retakeButton]}
                  onPress={() => setCapturedImage(null)}
                >
                  <Text style={styles.buttonText}>Retake</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.analyzeButton]}
                  onPress={analyzePicture}
                >
                  <Text style={styles.buttonText}>Analyze 🔍</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      ) : (
        // Camera view — overlay uses absolute positioning (required by CameraView)
        <View style={styles.cameraContainer}>
          <CameraView style={StyleSheet.absoluteFill} facing="back" ref={cameraRef} />

          {/* Guide overlay — absolutely positioned so it doesn't push buttons */}
          <View style={styles.cameraOverlay} pointerEvents="none">
            <View style={styles.guideline} />
            <Text style={styles.guideText}>Center leaf in frame</Text>
          </View>

          {/* Spacer pushes buttons to the bottom */}
          <View style={{ flex: 1 }} />

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
              <Text style={styles.iconText}>📁</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            {/* History button removed as it's now in the bottom tabs */}
            <View style={{ width: 60 }} />
          </View>
        </View>
      )}

      {/* Plot Picker Modal — outside the ternary, sibling to the main content */}
      <Modal visible={plotPickerVisible} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select a Plot</Text>
            <TouchableOpacity
              style={styles.pickerItem}
              onPress={() => { setSelectedPlot(null); setPlotPickerVisible(false); }}
            >
              <Text style={styles.pickerNone}>None (no plot)</Text>
            </TouchableOpacity>
            <FlatList
              data={plots}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, selectedPlot?.id === item.id && styles.pickerItemSelected]}
                  onPress={() => { setSelectedPlot(item); setPlotPickerVisible(false); }}
                >
                  <MapPin size={16} color={selectedPlot?.id === item.id ? '#10b981' : '#9ca3af'} />
                  <Text style={[styles.pickerItemText, selectedPlot?.id === item.id && { color: '#10b981' }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 140,   // leave room for button bar
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideline: {
    width: 280,
    height: 280,
    borderWidth: 3,
    borderColor: '#10b981',
    borderRadius: 20,
    borderStyle: 'dashed',
  },
  guideText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  preview: {
    width: '95%',
    height: '75%',
    borderRadius: 10,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#10b981',
    marginTop: 10,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#10b981',
  },
  iconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 28,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  retakeButton: {
    backgroundColor: '#ef4444',
  },
  analyzeButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  plotPicker: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1f2937', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 20, marginBottom: 10,
  },
  plotPickerText: {
    flex: 1, color: '#d1d5db', marginLeft: 8, fontSize: 14,
  },
  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#1f2937', borderTopLeftRadius: 16,
    borderTopRightRadius: 16, padding: 20, maxHeight: '60%',
  },
  pickerTitle: {
    color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16,
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  pickerItemSelected: { backgroundColor: '#111827', borderRadius: 8 },
  pickerItemText: { color: '#d1d5db', marginLeft: 10, fontSize: 15 },
  pickerNone: { color: '#9ca3af', fontSize: 15 },
});

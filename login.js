import React, { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { Button, View, Text, StyleSheet } from 'react-native';
import { auth } from './firebaseConfig'; 

// Ensures the browser window closes correctly after login
WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  // 1. Setup the Auth Request with your specific IDs
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: '1043088781890-l5c3ltnel8focg814gsjquthkrou0221.apps.googleusercontent.com',
    iosClientId: '1043088781890-8ghfebnkm1hrdmrq7r0csgvadf2vg3bk.apps.googleusercontent.com',
  });

  // 2. Handle the response from Google
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;

      // Create Firebase credential using the ID Token
      const credential = GoogleAuthProvider.credential(id_token);

      // Sign in to Firebase
      signInWithCredential(auth, credential)
        .then((userCredential) => {
          console.log("Logged in as:", userCredential.user.email);
        })
        .catch((error) => {
          console.error("Firebase Auth Error:", error.message);
        });
    }
  }, [response]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Garden Your Goals</Text>
      <View style={styles.buttonWrapper}>
        <Button
          disabled={!request}
          title="Sign in with Google"
          color="#4285F4" 
          onPress={() => promptAsync()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F5F5F5' 
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    marginBottom: 40,
    color: '#2D5A27' // Garden green
  },
  buttonWrapper: {
    width: '70%',
    borderRadius: 10,
    overflow: 'hidden'
  }
});
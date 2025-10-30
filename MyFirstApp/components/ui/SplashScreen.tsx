
import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/icon.png')}
        style={styles.image}
      />
      <Text style={styles.text}>© K.L.V.R.NAIDU</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: '#000000',
  },
});

export default SplashScreen;

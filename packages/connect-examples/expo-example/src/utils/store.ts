import AsyncStorage from '@react-native-async-storage/async-storage';

async function setItem(key: string, value: string) {
  return AsyncStorage.setItem(key, value);
}

async function getItem(key: string) {
  return AsyncStorage.getItem(key);
}

async function removeItem(key: string) {
  return AsyncStorage.removeItem(key);
}

export { setItem, getItem, removeItem };

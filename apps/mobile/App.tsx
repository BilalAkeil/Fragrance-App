import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CERTIFICATION_LABELS,
  certificationStatus,
  formatGBP,
  sampleListings,
  sampleSellers,
} from '@fragrance/core';

export default function App() {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sampleListings;
    return sampleListings.filter((l) =>
      [l.house, l.name, ...l.notes].some((s) => s.toLowerCase().includes(q)),
    );
  }, [query]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Fragrance Marketplace</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by brand, name or note"
        style={styles.search}
      />
      <FlatList
        data={results}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.muted}>No fragrances match your search.</Text>}
        renderItem={({ item }) => {
          const seller = sampleSellers.find((s) => s.id === item.sellerId)!;
          const status = certificationStatus(seller);
          return (
            <View style={styles.card}>
              <Text style={styles.muted}>{item.house}</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text>
                {item.sizeMl}ml {item.kind}
              </Text>
              <Text style={styles.price}>{formatGBP(item.pricePence)}</Text>
              <Text style={status === 'certified' ? styles.certified : styles.muted}>
                {seller.displayName} · {CERTIFICATION_LABELS[status]}
              </Text>
            </View>
          );
        }}
      />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '600', paddingHorizontal: 16, paddingTop: 16 },
  search: {
    margin: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  list: { paddingHorizontal: 16, gap: 12, paddingBottom: 32 },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 14 },
  name: { fontSize: 16, fontWeight: '600' },
  price: { fontSize: 18, fontWeight: '600', marginTop: 6 },
  muted: { color: '#666' },
  certified: { color: '#047857', fontWeight: '500' },
});

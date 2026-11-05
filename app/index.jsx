import { StyleSheet, Text, Pressable, View, Image } from 'react-native'
import { Link } from 'expo-router'
import AppShell from '../components/AppShell'
import SectionCard from '../components/SectionCard'

const Home = () => {
  return (
    <AppShell
      title="Workout Titan"
      subtitle="A workout partner right in your pocket"
      contentContainerStyle={styles.content}
    >
      <SectionCard style={styles.heroCard}>
        <Image
          source={require('../assets/AppAssets/Armoire/Front/Gr.Non.gif')}
          style={styles.heroImage}
          resizeMode="contain"
        />
        
      </SectionCard>

      <View style={styles.actions}>
        <Link href="/login" asChild>
          <Pressable style={StyleSheet.flatten([styles.button, styles.loginButton])}>
            <Text style={styles.loginButtonText}>Log In</Text>
          </Pressable>
        </Link>

        <Link href="/register" asChild>
          <Pressable style={StyleSheet.flatten([styles.button, styles.createButton])}>
            <Text style={styles.createButtonText}>Create Account</Text>
          </Pressable>
        </Link>
      </View>
    </AppShell>
  )
}

export default Home

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    flexGrow: 1,
  },
  heroCard: {
    marginBottom: 18,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  heroImage: {
    width: 300,
    height: 300,
    marginTop: 8,
    marginBottom: 12,
  },
  heroText: {
    color: '#5c3238',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
    width: '100%',
  },
  button: {
    minHeight: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 20,
    width: '100%',
  },
  loginButton: {
    backgroundColor: '#723a45',
    borderColor: '#b98d84',
    shadowColor: '#2d1418',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  createButton: {
    backgroundColor: '#f4b183',
    borderColor: '#ffd6be',
    shadowColor: '#5a2e22',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  loginButtonText: {
    color: '#f7e7e2',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  createButtonText: {
    color: '#4c271d',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
})






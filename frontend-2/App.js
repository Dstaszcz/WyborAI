import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
  BackHandler
} from 'react-native';
import axios from 'axios';
import mobileAds, {
  BannerAd,
  BannerAdSize,
  RewardedAd,
  RewardedAdEventType,
  TestIds
} from 'react-native-google-mobile-ads';

// Stałe
const QUESTIONS = [
  "Popieram liberalizację prawa aborcyjnego.",
  "Uważam, że państwo powinno finansować inicjatywy wspierające społeczność LGBT+.",
  "Jestem za likwidacją Funduszu Kościelnego.",
  "Popieram wprowadzenie ustawy uznającej język śląski za język regionalny.",
  "Uważam, że państwo powinno inwestować w budownictwo mieszkaniowe na wynajem.",
  "Opowiadam się za wprowadzeniem euro jako waluty w Polsce.",
  "Popieram federalizację Unii Europejskiej.",
  "Uważam, że Polska powinna zachować złotówkę jako walutę narodową.",
  "Jestem za zwiększeniem wydatków na obronność narodową.",
  "Popieram transformację energetyczną zgodnie z Zielonym Ładem UE.",
  "Uważam, że Polska powinna zawetować Zielony Ład UE.",
  "Jestem za obniżeniem podatku VAT do 22%.",
  "Popieram wprowadzenie niskich i prostych podatków dla przedsiębiorców.",
  "Uważam, że państwo powinno inwestować w Centralny Port Komunikacyjny (CPK).",
  "Jestem za wprowadzeniem podatku od nadzwyczajnych zysków banków.",
  "Polska powinna zwiększyć inwestycje w przemysł i energetykę jądrową.",
  "Popieram programy społeczne wspierające godność obywateli.",
  "Państwo powinno zapewniać tanie mieszkania dla młodych.",
  "Jestem za likwidacją rad nadzorczych w spółkach samorządowych.",
  "Polska powinna odzyskać pełną kontrolę nad polityką finansową.",
  "Uważam, że głównym sojusznikiem Polski powinny być Stany Zjednoczone.",
  "Polska powinna zacieśniać współpracę z Niemcami i Francją.",
  "Jestem za dalszą pomocą militarną dla Ukrainy.",
  "Polska powinna poprawić relacje z Białorusią i Rosją.",
  "Jestem przeciwny udziałowi polskich żołnierzy w zagranicznych misjach wojskowych.",
  "Polska powinna zwiększyć liczebność i wyposażenie armii.",
  "Popieram wprowadzenie obowiązkowego poboru do wojska.",
  "Polska powinna rozwijać własną produkcję uzbrojenia.",
  "Jestem za utrzymaniem obecnej polityki migracyjnej.",
  "Polska powinna dążyć do większej suwerenności w polityce zagranicznej."
];

const OPTIONS = [
  { label: 'Zgadzam się', value: 1 },
  { label: 'Nie zgadzam się', value: -1 },
  { label: 'Nie wiem', value: 0 },
];

const AD_CONFIG = {
  banner: __DEV__ ? TestIds.BANNER : 'ca-app-pub-6914323006576021/3248577881',
  rewarded: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-6914323006576021/1259579495'
};

const App = () => {
  const [state, setState] = useState({
    consentAccepted: false,
    showStart: true,
    currentQuestion: 0,
    answers: [],
    loading: false,
    result: '',
    showResult: false,
    adLoaded: false
  });

  // Inicjalizacja reklam
  const initAds = useCallback(() => {
    const init = async () => {
      await mobileAds().initialize();
      const rewardedAd = RewardedAd.createForAdRequest(AD_CONFIG.rewarded, {
        requestNonPersonalizedAdsOnly: true
      });

      const listeners = [
        rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, fetchResult),
        rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () =>
          setState(prev => ({ ...prev, adLoaded: true }))
      ];

      rewardedAd.load();

      return () => listeners.forEach(unsubscribe => unsubscribe());
    };

    init();
  }, []);

  // Obsługa przycisku wstecz
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (state.showResult) {
            resetQuiz();
            return true;
          }
          if (!state.showStart && !state.consentAccepted) {
            setState(prev => ({ ...prev, showStart: true }));
            return true;
          }
          return false;
        }
      );
      return () => backHandler.remove();
    }
  }, [state.showStart, state.showResult, state.consentAccepted]);

  const handleAnswer = (value) => {
    const newAnswers = [...state.answers, value];
    const nextQuestion = state.currentQuestion + 1;

    setState(prev => ({
      ...prev,
      answers: newAnswers,
      currentQuestion: nextQuestion
    }));

    if (nextQuestion >= QUESTIONS.length) {
      showRewardedAd();
    }
  };

  const showRewardedAd = () => {
    if (state.adLoaded) {
      // W rzeczywistej implementacji wywołaj rewardedAd.show()
      fetchResult(); // Tymczasowe rozwiązanie
    } else {
      Alert.alert(
        'Reklama niedostępna',
        'Wynik zostanie wyświetlony bez nagrody',
        [{ text: 'OK', onPress: fetchResult }]
      );
    }
  };

  const fetchResult = async () => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const res = await axios.post(
        'https://wyborai-backend.onrender.com/predict',
        { answers: state.answers },
        { timeout: 10000 }
      );
      setState(prev => ({
        ...prev,
        result: `${res.data.candidate} (${res.data.match_percent}%)`,
        showResult: true,
        loading: false
      }));
    } catch (err) {
      console.error('API Error:', err);
      Alert.alert(
        'Błąd',
        err.response?.data?.message || 'Nie udało się połączyć z serwerem.'
      );
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const resetQuiz = () => {
    setState({
      consentAccepted: false,
      showStart: true,
      currentQuestion: 0,
      answers: [],
      loading: false,
      result: '',
      showResult: false,
      adLoaded: false
    });
  };

  // Ekran zgody RODO
  if (!state.consentAccepted) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Zgoda na przetwarzanie danych</Text>
          <Text style={styles.text}>
            Aplikacja wyświetla reklamy Google AdMob, które mogą używać danych urządzenia.
          </Text>
          <Text style={styles.text}>
            Nie zapisujemy Twoich danych osobowych.{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('https://example.com/policy')}>
              Polityka prywatności
            </Text>
          </Text>
          <TouchableOpacity
            onPress={() => {
              setState(prev => ({ ...prev, consentAccepted: true }));
              initAds();
            }}
            style={styles.button}>
            <Text style={styles.buttonText}>Akceptuję i przechodzę dalej</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Ekran ładowania
  if (state.loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Analizuję Twoje odpowiedzi…</Text>
      </SafeAreaView>
    );
  }

  // Ekran wyników
  if (state.showResult) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Twój kandydat to:</Text>
          <Text style={styles.resultText}>{state.result}</Text>

          <Text style={styles.subtitle}>Twoje odpowiedzi:</Text>
          {state.answers.map((answer, index) => (
            <Text key={index} style={styles.answerText}>
              {index + 1}. {QUESTIONS[index]} →{' '}
              {OPTIONS.find(opt => opt.value === answer)?.label}
            </Text>
          ))}

          <TouchableOpacity
            onPress={resetQuiz}
            style={[styles.button, styles.restartButton]}>
            <Text style={styles.buttonText}>Zacznij od nowa</Text>
          </TouchableOpacity>

          <View style={styles.adContainer}>
            <BannerAd
              unitId={AD_CONFIG.banner}
              size={BannerAdSize.BANNER}
              requestOptions={{
                requestNonPersonalizedAdsOnly: true
              }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Ekran startowy
  if (state.showStart) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Quiz Wyborczy 2025</Text>
        <Text style={styles.text}>
          Dowiedz się, z którym kandydatem masz najwięcej wspólnego!
        </Text>
        <TouchableOpacity
          onPress={() => setState(prev => ({ ...prev, showStart: false }))}
          style={styles.button}>
          <Text style={styles.buttonText}>Rozpocznij quiz</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Ekran pytania
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.counter}>
        Pytanie {state.currentQuestion + 1}/{QUESTIONS.length}
      </Text>
      <Text style={styles.question}>{QUESTIONS[state.currentQuestion]}</Text>

      <View style={styles.optionsContainer}>
        {OPTIONS.map(option => (
          <TouchableOpacity
            key={option.value}
            onPress={() => handleAnswer(option.value)}
            style={styles.optionButton}>
            <Text style={styles.optionText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.adContainer}>
        <BannerAd
          unitId={AD_CONFIG.banner}
          size={BannerAdSize.BANNER}
        />
      </View>
    </SafeAreaView>
  );
};

// Style
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
    justifyContent: 'center'
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333'
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: '#333'
  },
  text: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
    color: '#555'
  },
  link: {
    color: '#007bff',
    textDecorationLine: 'underline'
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
    alignItems: 'center'
  },
  restartButton: {
    backgroundColor: '#dc3545',
    marginTop: 20
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  counter: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 10,
    textAlign: 'center'
  },
  question: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333'
  },
  optionsContainer: {
    width: '100%',
    marginBottom: 20
  },
  optionButton: {
    backgroundColor: '#e9ecef',
    padding: 15,
    borderRadius: 8,
    marginVertical: 8
  },
  optionText: {
    color: '#333',
    fontSize: 16,
    textAlign: 'center'
  },
  resultText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 20,
    textAlign: 'center'
  },
  answerText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#495057'
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#6c757d'
  },
  adContainer: {
    marginTop: 20,
    alignItems: 'center'
  }
});

export default App;
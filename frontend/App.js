import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking
} from 'react-native';
import axios from 'axios';
import mobileAds, {
  BannerAd,
  BannerAdSize,
  RewardedAd,
  RewardedAdEventType,
  TestIds
} from 'react-native-google-mobile-ads';

const questions = [
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

const options = [
  { label: 'Zgadzam się', value: 1 },
  { label: 'Nie zgadzam się', value: -1 },
  { label: 'Nie wiem', value: 0 },
];

// Podmień TestIds na swoje produkcyjne Ad Unit ID
const bannerAdUnitId = __DEV__
  ? TestIds.BANNER
  : 'ca-app-pub-6914323006576021/3248577881';
const rewardedAdUnitId = __DEV__
  ? TestIds.REWARDED
  : 'ca-app-pub-6914323006576021/1259579495';

const rewarded = RewardedAd.createForAdRequest(rewardedAdUnitId);

export default function App() {
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showStart, setShowStart] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    // inicjalizacja SDK
    mobileAds()
      .initialize()
      .then(() => {
        // SDK gotowe
      });

    const earnedListener = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => fetchResult()
    );
    const failListener = rewarded.addAdEventListener(
      RewardedAdEventType.AD_FAILED_TO_LOAD,
      () => Alert.alert('Błąd reklamy', 'Nie udało się załadować reklamy.')
    );

    rewarded.load();

    return () => {
      earnedListener();
      failListener();
    };
  }, []);

  const handleAnswer = (value) => {
    setAnswers(prev => [...prev, value]);
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(q => q + 1);
    } else {
      // pokazujemy rewarded
      rewarded.show();
    }
  };

  const fetchResult = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        'https://wyborai-backend.onrender.com/predict',
        { answers }
      );
      setResult(`${res.data.candidate} (${res.data.match_percent}%)`);
      setShowResult(true);
    } catch {
      Alert.alert('Błąd', 'Nie udało się połączyć z serwerem.');
    }
    setLoading(false);
  };

  // flow ekranów
  if (!consentAccepted) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.finalTitle}>Zgoda na przetwarzanie danych</Text>
          <Text style={styles.loadingText}>
            Aplikacja wyświetla reklamy Google AdMob, które mogą używać danych urządzenia do personalizacji.
          </Text>
          <Text style={styles.loadingText}>
            Nie zapisujemy Twoich danych osobowych ani odpowiedzi. Kontynuując, akceptujesz naszą{' '}
            <Text
              style={{ color: 'blue' }}
              onPress={() =>
                Linking.openURL(
                  'https://github.com/Dstaszcz/WyborAI/blob/main/Polityka_Prywatnosci.md'
                )
              }>
              Polityką Prywatności
            </Text>
            .
          </Text>
          <TouchableOpacity
            onPress={() => setConsentAccepted(true)}
            style={styles.button}>
            <Text style={styles.buttonText}>Akceptuję i przechodzę dalej</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Analizuję Twoje odpowiedzi…</Text>
      </SafeAreaView>
    );
  }
  if (showResult) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.finalTitle}>Twój kandydat to:</Text>
          <Text style={styles.candidate}>{result}</Text>
          <Text style={styles.summaryTitle}>Twoje odpowiedzi:</Text>
          {answers.map((v, i) => (
            <Text key={i} style={styles.summaryLine}>
              {i + 1}. {questions[i]} →{' '}
              {v === 1
                ? 'Zgadzam się'
                : v === -1
                ? 'Nie zgadzam się'
                : 'Nie wiem'}
            </Text>
          ))}
          <TouchableOpacity
            onPress={() => {
              setAnswers([]);
              setResult('');
              setCurrentQuestion(0);
              setShowResult(false);
              setShowStart(true);
            }}
            style={styles.restartButton}>
            <Text style={styles.restartText}>Zacznij od nowa</Text>
          </TouchableOpacity>
          <View style={styles.adContainer}>
            <BannerAd
              unitId={bannerAdUnitId}
              size={BannerAdSize.FULL_BANNER}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  if (showStart) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.finalTitle}>Quiz Wyborczy 2025</Text>
        <Text style={styles.loadingText}>
          Dowiedz się, z którym kandydatem masz najwięcej wspólnego!
        </Text>
        <TouchableOpacity
          onPress={() => setShowStart(false)}
          style={styles.button}>
          <Text style={styles.buttonText}>Rozpocznij quiz</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.questionCounter}>
        {currentQuestion + 1}/{questions.length}
      </Text>
      <Text style={styles.question}>{questions[currentQuestion]}</Text>
      <View style={styles.optionsContainer}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => handleAnswer(opt.value)}
            style={styles.button}>
            <Text style={styles.buttonText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.adContainer}>
        <BannerAd
          unitId={bannerAdUnitId}
          size={BannerAdSize.BANNER}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  scrollContainer: {
    alignItems: 'center',
    padding: 16
  },
  questionCounter: {
    fontSize: 16,
    marginBottom: 8,
    color: '#888'
  },
  question: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600'
  },
  optionsContainer: {
    width: '100%'
  },
  button: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 10,
    marginVertical: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center'
  },
  finalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 12
  },
  summaryLine: {
    fontSize: 14,
    marginBottom: 6,
    textAlign: 'left'
  },
  candidate: {
    fontSize: 20,
    color: '#16a34a',
    marginBottom: 24
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555'
  },
  adContainer: {
    marginTop: 24,
    alignItems: 'center'
  },
  restartButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    marginTop: 24
  },
  restartText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600'
  }
});

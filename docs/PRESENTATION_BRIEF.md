# 💊 Apteczka Seniora - Brief Prezentacyjny

---

## 📋 O Aplikacji

**Apteczka Seniora** to mobilna aplikacja do zarządzania lekami, zaprojektowana z myślą o seniorach i ich opiekunach. Aplikacja łączy prostotę obsługi z zaawansowanymi funkcjami monitorowania, tworząc kompleksowy system wsparcia w codziennym przyjmowaniu leków.

---

## 🎯 Główne Cele

| Cel | Opis |
|-----|------|
| **Bezpieczeństwo** | Automatyczne wykrywanie interakcji lekowych, alerty o terminach ważności |
| **Regularność** | System przypomnień o dawkach z powiadomieniami push |
| **Nadzór** | Zdalne monitorowanie przez opiekunów rodzinnych |
| **Prostota** | Intuicyjny interfejs dostosowany do potrzeb seniorów |

---

## 👥 Role Użytkowników

### 👴 Senior
- Dodaje leki do swojej "apteczki"
- Otrzymuje przypomnienia o dawkach
- Potwierdza przyjęcie leków
- Może powiązać się z opiekunem

### 👩‍⚕️ Opiekun
- Monitoruje wielu podopiecznych
- Otrzymuje alerty o:
  - Pominiętych dawkach
  - Niskim stanie leków
  - Kończącej się dacie ważności
  - Interakcjach lekowych
- Może zadzwonić do seniora bezpośrednio z aplikacji

---

## ⚡ Kluczowe Funkcjonalności

### 1. 📸 Skanowanie Kodów Kreskowych
- Automatyczne rozpoznawanie leku po kodzie EAN
- Pobieranie danych z zewnętrznej bazy leków
- Alternatywne ręczne wprowadzanie danych
- Lista popularnych leków do szybkiego wyboru

### 2. ⚠️ Wykrywanie Interakcji Lekowych
- Baza 15+ zdefiniowanych interakcji
- 4 poziomy ryzyka: niskie → średnie → wysokie → krytyczne
- Ostrzeżenia wyświetlane przy dodawaniu nowych leków
- Szczegółowe zalecenia dla każdej interakcji

### 3. 🔔 System Przypomnień
- Konfigurowalne harmonogramy (dni tygodnia, godziny)
- Powiadomienia push z akcjami szybkiego działania:
  - ✅ "Przyjąłem"
  - ⏰ "Przypomnij później"
  - ❌ "Pomiń"
- Automatyczne śledzenie statusu dawek

### 4. 📊 Panel Opiekuna
- Dashboard z przeglądem wszystkich seniorów
- System alertów w czasie rzeczywistym
- Szczegółowy widok harmonogramu każdego seniora
- Możliwość szybkiego kontaktu telefonicznego

### 5. 🔗 System Powiązań
- Generowanie kodów zaproszeniowych (ważnych 24h)
- Bezpieczne łączenie kont senior-opiekun
- Jeden opiekun może nadzorować wielu seniorów
- Senior może mieć wielu opiekunów

---

## 🛠️ Stos Technologiczny

### Frontend
| Technologia | Wersja | Zastosowanie |
|-------------|--------|--------------|
| **React Native** | 0.81.5 | Framework mobilny |
| **Expo** | 54.0 | Platforma deweloperska |
| **TypeScript** | 5.3 | Typowanie statyczne |
| **Zustand** | 5.0 | Zarządzanie stanem |
| **React Navigation** | 7.x | Nawigacja |

### Backend & Baza Danych
| Technologia | Zastosowanie |
|-------------|--------------|
| **Firebase Authentication** | Autoryzacja użytkowników |
| **Cloud Firestore** | Baza danych NoSQL |
| **Firebase Cloud Messaging** | Powiadomienia push |

### Dodatkowe Biblioteki
| Biblioteka | Zastosowanie |
|------------|--------------|
| **expo-camera** | Skanowanie kodów kreskowych |
| **expo-notifications** | Powiadomienia lokalne i push |
| **date-fns** | Obsługa dat i czasu |
| **react-hook-form** | Formularze |
| **@expo/vector-icons** | Ikony (Ionicons) |

---

## 📁 Architektura Projektu

```
src/
├── components/           # Komponenty UI
│   ├── common/          # Button, Card, Input
│   ├── medication/      # MedicationCard, InteractionAlert
│   └── reminders/       # DoseCard
├── screens/             # Ekrany aplikacji
│   ├── auth/            # Login, Register
│   ├── senior/          # Dashboard, Medications, Schedule
│   ├── caregiver/       # Monitoring, Seniors, Alerts
│   └── shared/          # Profile, LinkCaregiver
├── services/            # Logika biznesowa
│   ├── api/             # Firebase services
│   ├── barcode/         # Skanowanie kodów
│   ├── doses/           # Generator dawek
│   ├── interactions/    # Checker interakcji
│   └── notifications/   # Push notifications
├── store/               # Zustand stores
├── types/               # TypeScript interfaces
├── constants/           # Theme, colors
└── navigation/          # React Navigation setup
```

---

## 🎨 Design System

### Paleta Kolorów
- **Primary**: Niebieski (#3B82F6) - główny kolor akcji
- **Success**: Zielony (#10B981) - potwierdzenia
- **Warning**: Pomarańczowy (#F59E0B) - ostrzeżenia
- **Error**: Czerwony (#EF4444) - błędy, alerty krytyczne

### Typografia
- Hierarchia nagłówków (H1-H4)
- Czytelne fonty systemowe
- Zwiększone rozmiary dla seniorów

### Komponenty
- Karty z cieniami i zaokrągleniami
- Duże przyciski dotykowe
- Ikony z biblioteki Ionicons
- Spójny spacing i padding

---

## 🔒 Bezpieczeństwo

- Autoryzacja email/hasło przez Firebase Auth
- Reguły Firestore ograniczające dostęp do danych
- Opiekunowie widzą tylko dane powiązanych seniorów
- Kody zaproszeniowe z czasem wygasania

---

## 📱 Platformy Docelowe

- ✅ **Android** (główna platforma deweloperska)
- ✅ **iOS** (wymaga konta Apple Developer)
- ⚠️ **Web** (częściowe wsparcie przez Expo)

---

## 🚀 Jak Uruchomić Demo

```bash
# 1. Zainstaluj zależności
npm install

# 2. Uruchom serwer deweloperski
npx expo start

# 3. Zeskanuj kod QR aplikacją Expo Go
```

---

## 📊 Dane Demo

### Konta testowe:
| Rola | Email | Hasło |
|------|-------|-------|
| Senior 1 | jan.kowalski@demo.pl | abc123 |
| Senior 2 | maria.nowak@demo.pl | abc123 |
| Opiekun | anna.wisniewska@demo.pl | abc123 |

### Scenariusze do pokazania:
1. ✅ Skanowanie/dodawanie leku
2. ⚠️ Wykrycie interakcji (Warfarin + Aspirin)
3. 🔔 Przypomnienie o dawce
4. 📊 Panel opiekuna z alertami
5. 🔗 Powiązanie kont kodem

---

## 💡 Potencjalny Rozwój

- [ ] Integracja z rzeczywistą bazą leków (np. API URPL)
- [ ] Eksport historii dawek do PDF
- [ ] Kalendarz wizyt lekarskich
- [ ] Czat między opiekunem a seniorem
- [ ] Widget na ekran główny telefonu
- [ ] Tryb głosowy dla osób słabowidzących

---

## 👨‍💻 Zespół

*[Uzupełnij dane zespołu]*

---

**Wersja:** 1.0.0  
**Data:** Styczeń 2026

# 🔥 Konfiguracja Firebase dla Apteczka Seniora

## Krok 1: Utworzenie konta Firebase

1. Otwórz przeglądarkę i przejdź do: **https://console.firebase.google.com/**

2. Zaloguj się kontem Google (lub utwórz nowe konto Google jeśli nie masz)

3. Kliknij przycisk **"Utwórz projekt"** (lub "Create a project" w wersji angielskiej)

---

## Krok 2: Tworzenie projektu Firebase

1. **Nazwa projektu**: Wpisz `apteczka-seniora` (lub dowolną inną nazwę)

2. Kliknij **"Kontynuuj"**

3. **Google Analytics**: Możesz wyłączyć (przesuń suwak na "off") - nie jest wymagane dla tej aplikacji

4. Kliknij **"Utwórz projekt"**

5. Poczekaj aż projekt zostanie utworzony (ok. 30 sekund)

6. Kliknij **"Kontynuuj"** aby przejść do konsoli projektu

---

## Krok 3: Dodanie aplikacji webowej

1. Na stronie głównej projektu, kliknij ikonę **"</>"** (Web) aby dodać aplikację webową

   ![Ikona Web](https://i.imgur.com/placeholder.png)

2. **Nazwa aplikacji**: Wpisz `Apteczka Seniora Web`

3. **Firebase Hosting**: NIE zaznaczaj tej opcji (nie jest potrzebna)

4. Kliknij **"Zarejestruj aplikację"**

5. **WAŻNE!** Pojawi się konfiguracja Firebase - **skopiuj te dane!**

   Będziesz widział coś takiego:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyB1234567890abcdefghijklmnop",
     authDomain: "apteczka-seniora.firebaseapp.com",
     projectId: "apteczka-seniora",
     storageBucket: "apteczka-seniora.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef123456789"
   };
   ```

6. Kliknij **"Przejdź do konsoli"**

---

## Krok 4: Włączenie Authentication (Logowanie)

1. W menu po lewej stronie kliknij **"Kompilacja"** → **"Authentication"**

2. Kliknij przycisk **"Rozpocznij"**

3. W zakładce **"Sign-in method"** kliknij na **"E-mail/hasło"**

4. Włącz pierwszy przełącznik **"E-mail/hasło"** (przesuń na niebiesko)

5. Drugi przełącznik (link e-mail) zostaw wyłączony

6. Kliknij **"Zapisz"**

✅ Authentication jest teraz skonfigurowane!

---

## Krok 5: Utworzenie bazy danych Firestore

1. W menu po lewej stronie kliknij **"Kompilacja"** → **"Firestore Database"**

2. Kliknij **"Utwórz bazę danych"**

3. **Lokalizacja**: Wybierz `europe-west1` (Belgia) lub `europe-central2` (Warszawa) dla najlepszej wydajności w Polsce

4. Kliknij **"Dalej"**

5. **Reguły bezpieczeństwa**: Wybierz **"Rozpocznij w trybie testowym"**
   
   ⚠️ Uwaga: Tryb testowy pozwala na dostęp bez ograniczeń przez 30 dni. Później trzeba będzie skonfigurować właściwe reguły.

6. Kliknij **"Utwórz"**

7. Poczekaj aż baza zostanie utworzona

✅ Firestore Database jest gotowe!

---

## Krok 6: Konfiguracja reguł bezpieczeństwa Firestore

1. W Firestore Database przejdź do zakładki **"Reguły"**

2. Zastąp istniejące reguły poniższymi:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Użytkownicy - każdy może czytać i pisać tylko swoje dane
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // Opiekunowie mogą czytać dane swoich podopiecznych
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.seniorIds.hasAny([userId]);
    }
    
    // Leki - właściciel i jego opiekunowie
    match /medications/{medicationId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.seniorIds.hasAny([resource.data.userId]);
    }
    
    // Harmonogramy
    match /schedules/{scheduleId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    // Logi dawek
    match /doseLogs/{logId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.seniorIds.hasAny([resource.data.userId]);
    }
    
    // Interakcje lekowe - tylko odczyt dla zalogowanych
    match /drugInteractions/{interactionId} {
      allow read: if request.auth != null;
    }
  }
}
```

3. Kliknij **"Opublikuj"**

---

## Krok 7: Konfiguracja pliku .env w projekcie

1. W folderze projektu `c:\Github\medyczne\` znajdź plik `.env.example`

2. Skopiuj go jako `.env`:
   ```
   copy .env.example .env
   ```

3. Otwórz plik `.env` i uzupełnij danymi z Kroku 3:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyB1234567890abcdefghijklmnop
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=apteczka-seniora.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=apteczka-seniora
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=apteczka-seniora.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456789

# Expo Project ID (opcjonalne - dla push notifications)
EXPO_PUBLIC_PROJECT_ID=
```

**Mapowanie wartości:**
| Firebase Config | Plik .env |
|-----------------|-----------|
| `apiKey` | `EXPO_PUBLIC_FIREBASE_API_KEY` |
| `authDomain` | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `EXPO_PUBLIC_FIREBASE_PROJECT_ID` |
| `storageBucket` | `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `EXPO_PUBLIC_FIREBASE_APP_ID` |

---

## Krok 8: Utworzenie indeksów Firestore (opcjonalne, ale zalecane)

Podczas korzystania z aplikacji, Firebase może wyświetlać w konsoli błędy z linkami do tworzenia indeksów. Możesz je utworzyć ręcznie:

1. W Firestore Database przejdź do zakładki **"Indeksy"**

2. Kliknij **"Utwórz indeks"**

3. Dodaj te indeksy:

   **Indeks 1 - Leki użytkownika:**
   - Kolekcja: `medications`
   - Pole 1: `userId` (Rosnąco)
   - Pole 2: `addedAt` (Malejąco)

   **Indeks 2 - Logi dawek:**
   - Kolekcja: `doseLogs`
   - Pole 1: `userId` (Rosnąco)
   - Pole 2: `scheduledTime` (Malejąco)

   **Indeks 3 - Harmonogramy:**
   - Kolekcja: `schedules`
   - Pole 1: `userId` (Rosnąco)
   - Pole 2: `isActive` (Rosnąco)

---

## Krok 9: Testowanie konfiguracji

1. Uruchom aplikację:
   ```bash
   cd c:\Github\medyczne
   npm start
   ```

2. Zeskanuj kod QR aplikacją Expo Go na telefonie

3. Spróbuj się zarejestrować

4. Sprawdź w Firebase Console:
   - **Authentication** → czy pojawił się nowy użytkownik
   - **Firestore** → czy utworzył się dokument w kolekcji `users`

---

## ❓ Rozwiązywanie problemów

### Problem: "Firebase: Error (auth/configuration-not-found)"
**Rozwiązanie:** Sprawdź czy wszystkie wartości w `.env` są poprawnie skopiowane (bez cudzysłowów, bez spacji na początku/końcu)

### Problem: "Firebase: Error (auth/network-request-failed)"
**Rozwiązanie:** Sprawdź połączenie internetowe. Upewnij się, że nie masz włączonego VPN.

### Problem: "Missing or insufficient permissions"
**Rozwiązanie:** Sprawdź reguły Firestore (Krok 6). Upewnij się, że użytkownik jest zalogowany.

### Problem: Aplikacja nie widzi zmian w .env
**Rozwiązanie:** Zatrzymaj serwer (Ctrl+C) i uruchom ponownie `npm start`

---

## 📋 Checklist - czy wszystko działa?

- [ ] Projekt Firebase utworzony
- [ ] Aplikacja webowa dodana
- [ ] Authentication (Email/Password) włączone
- [ ] Firestore Database utworzona
- [ ] Reguły bezpieczeństwa opublikowane
- [ ] Plik `.env` uzupełniony
- [ ] Aplikacja uruchamia się bez błędów
- [ ] Rejestracja nowego użytkownika działa
- [ ] Użytkownik pojawia się w Firebase Console

---

## 🎉 Gotowe!

Twoja aplikacja Apteczka Seniora jest teraz połączona z Firebase. Możesz zacząć testować wszystkie funkcje!

Jeśli potrzebujesz pomocy, sprawdź dokumentację Firebase:
https://firebase.google.com/docs

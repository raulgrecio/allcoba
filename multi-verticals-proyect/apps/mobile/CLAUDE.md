# CLAUDE.md — apps/mobile

> Contexto específico de la app móvil Flutter.
> Lee también el CLAUDE.md raíz del proyecto antes de trabajar aquí.

---

## Qué es este proceso

App móvil construida con **Flutter + Dart**. Un único codebase para iOS y Android. Consume la misma API REST que la web — no tiene acceso directo a la base de datos.

Arquitectura interna: **Clean Architecture + Riverpod** (state management). Los repositorios implementan interfaces del dominio, igual que en la API.

---

## Estructura de carpetas

```
apps/mobile/lib/
├── main.dart                         ← entry point, inicialización de providers
├── core/
│   ├── api/                          ← cliente HTTP (Dio) con interceptors de auth
│   ├── auth/                         ← gestión de tokens, sesión, MFA
│   ├── storage/                      ← Drift (SQLite) para cache offline
│   ├── geo/                          ← geolocalización del dispositivo
│   └── notifications/                ← FCM — sólo push, sin Firebase DB
├── features/
│   ├── search/                       ← búsqueda de providers por vertical y geo
│   │   ├── data/                     ← repositorio + modelos de API
│   │   ├── domain/                   ← entidades + ports
│   │   └── presentation/            ← screens + widgets + providers Riverpod
│   ├── provider_profile/             ← ficha detallada del provider
│   ├── contact/                      ← flujo de contacto anónimo
│   ├── conversations/                ← gestión de conversaciones activas
│   ├── reviews/                      ← calificar a un provider
│   └── auth/                         ← login, registro, MFA TOTP
└── shared/
    ├── widgets/                      ← componentes reutilizables
    ├── theme/                        ← design tokens, colores, tipografía
    └── utils/
```

---

## State management con Riverpod

Cada feature tiene sus providers en `presentation/providers/`. Los providers son `AsyncNotifier` para estado asíncrono y `Notifier` para estado síncrono.

```dart
// features/search/presentation/providers/search_providers.dart

@riverpod
class SearchNotifier extends _$SearchNotifier {
  @override
  FutureOr<SearchResult> build() => const SearchResult.empty();

  Future<void> search(SearchParams params) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(searchRepositoryProvider).search(params),
    );
  }
}

// El repositorio implementa la interfaz del dominio
// El provider de Riverpod inyecta la implementación real o un fake para tests
@riverpod
SearchRepository searchRepository(SearchRepositoryRef ref) {
  return SearchRepositoryImpl(ref.read(apiClientProvider));
}
```

---

## Mapa (flutter_map — sin licencia)

```dart
// features/search/presentation/widgets/providers_map.dart
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong2.dart';

// Tiles gratuitos — OpenStreetMap (sin API key)
TileLayer(
  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  userAgentPackageName: 'com.tudominio.marketplace',
),

// Markers de providers
MarkerLayer(
  markers: providers.map((p) => Marker(
    point: LatLng(p.location.lat, p.location.lng),
    child: ProviderMapMarker(provider: p),
  )).toList(),
),
```

---

## Cache offline con Drift (SQLite)

```dart
// core/storage/app_database.dart
@DriftDatabase(tables: [CachedProviders, CachedConversations])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  // Guardar providers visitados para acceso offline
  Future<void> cacheProvider(CachedProvidersCompanion provider) =>
    into(cachedProviders).insertOnConflictUpdate(provider);

  // Providers cacheados en las últimas 24h
  Future<List<CachedProvider>> getRecentProviders(String vertical) =>
    (select(cachedProviders)
      ..where((p) => p.vertical.equals(vertical))
      ..where((p) => p.cachedAt.isBiggerThanValue(
          DateTime.now().subtract(const Duration(hours: 24))))
    ).get();
}
```

---

## Autenticación — tokens en memoria segura

```dart
// core/auth/token_storage.dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// El refresh token va en almacenamiento seguro del dispositivo (Keychain/Keystore)
// El access token va en memoria — nunca en disco
class TokenStorage {
  static const _storage = FlutterSecureStorage();
  static String? _accessToken;  // en memoria

  static Future<void> saveRefreshToken(String token) =>
    _storage.write(key: 'refresh_token', value: token);

  static Future<String?> getRefreshToken() =>
    _storage.read(key: 'refresh_token');

  static void setAccessToken(String token) => _accessToken = token;
  static String? getAccessToken() => _accessToken;
  static void clearAll() {
    _accessToken = null;
    _storage.delete(key: 'refresh_token');
  }
}
```

---

## Notificaciones push (FCM — sólo mensajería)

FCM se usa **únicamente como canal de entrega de push notifications**. No se usa Firebase Firestore, Firebase Auth, ni ninguna otra API de Firebase. La app no tiene dependencia de Firebase para datos.

```dart
// core/notifications/push_service.dart

Future<void> initPushNotifications() async {
  final token = await FirebaseMessaging.instance.getToken();

  // Registrar el token en nuestra API — no en Firebase
  await apiClient.registerPushToken(token!);
}

// Handler de notificaciones recibidas
FirebaseMessaging.onMessage.listen((message) {
  // Las notificaciones no contienen PII — sólo tipo y conversationId
  final type = message.data['type'];
  final conversationId = message.data['conversationId'];
  router.navigateTo('/conversaciones/$conversationId');
});
```

---

## Testing en Flutter

```dart
// test/features/search/search_notifier_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:riverpod/riverpod.dart';

void main() {
  test('búsqueda devuelve providers ordenados por distancia', () async {
    // Usar un repositorio fake — sin llamadas de red
    final container = ProviderContainer(
      overrides: [
        searchRepositoryProvider.overrideWithValue(FakeSearchRepository()),
      ],
    );

    final notifier = container.read(searchNotifierProvider.notifier);
    await notifier.search(SearchParams(vertical: 'hairdresser', lat: 40.4168, lng: -3.7038));

    final state = container.read(searchNotifierProvider);
    expect(state.hasValue, true);
    expect(state.value!.providers.first.distanceMeters, lessThan(100));
  });
}
```

```bash
# Tests unitarios
flutter test

# Tests de widget (golden tests)
flutter test --update-goldens   # actualizar snapshots
flutter test                    # verificar contra snapshots

# Tests de integración en dispositivo/emulador
flutter test integration_test/
```

---

## Comandos habituales

```bash
# Desarrollo
flutter run                     # lanza en dispositivo/emulador conectado
flutter run -d chrome           # lanza en Chrome (Flutter Web — opcional)

# Build de producción
flutter build apk --release     # Android
flutter build ipa               # iOS (requiere macOS + Xcode)

# Análisis estático
flutter analyze
dart fix --apply

# Formatear código
dart format lib/
```

---

## Dependencias principales (pubspec.yaml)

```yaml
dependencies:
  flutter_riverpod: ^2.5 # state management
  dio: ^5.4 # cliente HTTP
  flutter_map: ^6.1 # mapas sin licencia (OSM)
  latlong2: ^0.9 # coordenadas para flutter_map
  drift: ^2.18 # SQLite ORM para cache offline
  flutter_secure_storage: ^9 # almacenamiento seguro de tokens
  firebase_messaging: ^14 # push notifications (sólo mensajería)
  go_router: ^13 # navegación declarativa
  intl: ^0.19 # internacionalización

dev_dependencies:
  flutter_test:
    sdk: flutter
  riverpod_generator: ^2.4 # generación de providers
  drift_dev: ^2.18 # generación de código Drift
  build_runner: ^2.4
```

Sin Firebase Auth. Sin Firebase Firestore. Sin Supabase Flutter SDK. Sin dependencias de datos en servicios de terceros.

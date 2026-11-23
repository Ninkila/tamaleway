#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "TamaleWorldTypes.generated.h"

UENUM(BlueprintType)
enum class ETamaleWeather : uint8
{
    Clear        UMETA(DisplayName = "Clear Skies"),
    Cloudy       UMETA(DisplayName = "Cloudy"),
    Heat         UMETA(DisplayName = "High Savannah Heat"),
    Harmattan    UMETA(DisplayName = "Harmattan Haze"),
    LightRain    UMETA(DisplayName = "Light Rain"),
    Rain         UMETA(DisplayName = "Rain"),
    Thunderstorm UMETA(DisplayName = "Thunderstorm")
};

UENUM(BlueprintType)
enum class ETamaleTimePeriod : uint8
{
    Morning   UMETA(DisplayName = "Morning (Dasuba)"),
    Afternoon UMETA(DisplayName = "Afternoon (Wuntanga)"),
    Evening   UMETA(DisplayName = "Evening (Zaawuni)"),
    Night     UMETA(DisplayName = "Night")
};

UENUM(BlueprintType)
enum class EHomeStationType : uint8
{
    DoorEnterOrExit UMETA(DisplayName = "Compound / House Door"),
    BedSleep        UMETA(DisplayName = "Bedroom Bed (Sleep & Alarm)"),
    BathroomShower  UMETA(DisplayName = "Bathroom Shower"),
    BathroomSink    UMETA(DisplayName = "Bathroom Washbasin"),
    KitchenStove    UMETA(DisplayName = "Kitchen Cooker / Stove"),
    KitchenFridge   UMETA(DisplayName = "Kitchen Fridge / Pantry"),
    KitchenSink     UMETA(DisplayName = "Kitchen Sink (Wash Dishes)"),
    CourtyardSweep  UMETA(DisplayName = "Courtyard Broom / Clean Area"),
    LaundryWashTub  UMETA(DisplayName = "Courtyard Laundry Wash Tub"),
    Clothesline     UMETA(DisplayName = "Courtyard Clothesline"),
    Wardrobe        UMETA(DisplayName = "Bedroom Wardrobe"),
    LivingRoomSofa  UMETA(DisplayName = "Living Room Sofa / TV")
};

USTRUCT(BlueprintType)
struct TAMALE3D_API FTamaleNeedsData
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Needs")
    float Energy = 88.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Needs")
    float Hygiene = 88.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Needs")
    float Hunger = 82.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Needs")
    float Thirst = 80.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Needs")
    float Comfort = 82.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Needs")
    float Social = 76.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Needs")
    float OutfitCleanliness = 92.0f;
};

USTRUCT(BlueprintType)
struct TAMALE3D_API FTamaleHomeStateData
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Home")
    FString HomeName = TEXT("Changli Residential Compound");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Home")
    FString HomeDistrict = TEXT("Changli - Jakarayili Residential Quarter");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Home")
    float HomeCleanliness = 88.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Home")
    int32 DirtyDishesCount = 1;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Home")
    int32 RubbishCount = 1;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Home")
    int32 DirtyClothesCount = 1;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Home")
    int32 HangingLaundryCount = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Home")
    int32 BedUpgradeLevel = 1;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Home")
    int32 DailyBillsOwedCedis = 0;
};

USTRUCT(BlueprintType)
struct TAMALE3D_API FTamaleCharacterSaveState
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Character")
    FName CharacterId = FName(TEXT("yakubu_pragya"));

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Character")
    FString DisplayName = TEXT("Yakubu Mohammed");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Economy")
    int32 MoneyCedis = 180;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Economy")
    int32 BankBalanceCedis = 270;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Economy")
    int32 MomoBalanceCedis = 65;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression")
    int32 CultureXp = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression")
    int32 DayCount = 1;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Location")
    FVector SavedWorldLocation = FVector(2000.0f, 8900.0f, 92.0f);

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Location")
    FRotator SavedWorldRotation = FRotator(0.0f, -90.0f, 0.0f);

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Needs")
    FTamaleNeedsData Needs;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Home")
    FTamaleHomeStateData HomeState;
};

/* ---------- Imported DataTable Row Structs (1m Three.js -> 100cm Unreal) ---------- */

USTRUCT(BlueprintType)
struct TAMALE3D_API FTamaleRoadRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString RoadId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DisplayName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Orientation;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FVector CenterLocationCm = FVector::ZeroVector;
    /** Centre-line end points (exported since the width/length fix). */
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FVector StartLocationCm = FVector::ZeroVector;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FVector EndLocationCm = FVector::ZeroVector;
    /** Carriageway width (across the road). */
    UPROPERTY(EditAnywhere, BlueprintReadOnly) float WidthCm = 750.0f;
    /** Length along the road's direction. */
    UPROPERTY(EditAnywhere, BlueprintReadOnly) float LengthCm = 6000.0f;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString SurfaceType;

    bool IsEastWest() const { return Orientation == TEXT("EastWest"); }

    /** Axis-aligned 2D footprint of the carriageway in world centimetres. */
    FBox2D GetFootprint2D() const
    {
        const double HalfLen = LengthCm * 0.5;
        const double HalfW = WidthCm * 0.5;
        const FVector2D C(CenterLocationCm.X, CenterLocationCm.Y);
        const FVector2D Half = IsEastWest() ? FVector2D(HalfLen, HalfW) : FVector2D(HalfW, HalfLen);
        return FBox2D(C - Half, C + Half);
    }
};

/** Building footprint exported from src/data/tamaleWorldLayout.ts (landmarks, houses, shop rows). */
USTRUCT(BlueprintType)
struct TAMALE3D_API FTamaleBuildingRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString BuildingId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DisplayName;
    /** Landmark | House | Shop */
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Category;
    /** Box | Cylinder */
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Shape;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString LandmarkId;
    /** Ground-level centre of the footprint. */
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FVector CenterLocationCm = FVector::ZeroVector;
    /** X/Y footprint (diameter for cylinders) and Z height, in centimetres. */
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FVector SizeCm = FVector(800.0f, 600.0f, 400.0f);
    UPROPERTY(EditAnywhere, BlueprintReadOnly) float YawDegrees = 0.0f;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Style;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString WallColorHex;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString AccentColorHex;
};

USTRUCT(BlueprintType)
struct TAMALE3D_API FTamaleLandmarkRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString LandmarkId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DisplayName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DagbaniLabel;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString District;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString LandmarkType;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FVector LocationCm = FVector::ZeroVector;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) float TriggerRadiusCm = 1200.0f;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) bool bEnterable = false;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString ShopId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString OsmCoords;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) bool bIsRepresentativeFictional = false;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString AuthenticityNote;
};

USTRUCT(BlueprintType)
struct TAMALE3D_API FTamaleDistrictRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DistrictId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DisplayName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DagbaniName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString OsmCoords;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString BearingFromInterchange;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FVector CenterLocationCm = FVector::ZeroVector;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) float RadiusCm = 2800.0f;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString CharacterSummary;
};

USTRUCT(BlueprintType)
struct TAMALE3D_API FTamalePlayableCharacterRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString CharacterId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DisplayName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Nickname;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Occupation;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DagbaniTitle;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString HomeDistrict;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString HomeLandmarkId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FVector SpawnLocationCm = FVector(2000.0f, 8900.0f, 92.0f);
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 StartingMoneyCedis = 180;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) float StartingEnergy = 90.0f;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DefaultOutfitStyle;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString PrimaryColorHex;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString SecondaryColorHex;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString CareerTrack;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DailyRoutineSummary;
};

USTRUCT(BlueprintType)
struct TAMALE3D_API FTamaleNpcRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString NpcId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DisplayName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Role;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString District;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FVector HomeLocationCm = FVector::ZeroVector;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString ShopId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString MorningGreetingDagbani;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString MorningGreetingEnglish;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString EveningGreetingDagbani;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString EveningGreetingEnglish;
};

USTRUCT(BlueprintType)
struct TAMALE3D_API FTamaleShopRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString ShopId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Title;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DagbaniTitle;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString District;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Category;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) float OpenHour = 7.0f;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) float CloseHour = 21.0f;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString StaffName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 BuyableSharePriceCedis = 0;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 DailyRevenueCedis = 0;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString AuthenticityStatus;
};

USTRUCT(BlueprintType)
struct TAMALE3D_API FTamaleRecipeRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString RecipeId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DisplayName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DagbaniName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Description;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 CookMinutes = 25;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) float HungerRestore = 40.0f;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) float EnergyRestore = 25.0f;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) float ThirstRestore = 5.0f;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) float ComfortRestore = 15.0f;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 CultureXp = 10;
};

USTRUCT(BlueprintType)
struct TAMALE3D_API FTamaleDagbaniTermRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString TermId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Dagbani;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString English;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString PhoneticGuide;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Category;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString UsageNote;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString VerificationStatus;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString AudioStatus;
};

USTRUCT(BlueprintType)
struct TAMALE3D_API FTamaleMusicTrackRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString TrackId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Title;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Artist;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Album;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Region;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Genre;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 Bpm = 100;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 DurationSec = 180;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString LicenseStatus;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString PermissionStatus;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString LicenseOwner;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString AudioAssetPath;
};

USTRUCT(BlueprintType)
struct TAMALE3D_API FTamaleIngredientRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString IngredientId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DisplayName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DagbaniName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString UnitLabel;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 RetailPriceCedis = 10;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Description;
};

USTRUCT(BlueprintType)
struct TAMALE3D_API FTamaleHomeUpgradeRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString UpgradeId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DisplayName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DagbaniName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Category;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 MaxLevel = 2;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 Level2CostCedis = 200;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Level2Title;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Level2Effect;
};

USTRUCT(BlueprintType)
struct TAMALE3D_API FTamaleEventRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString EventId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DisplayName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString DagbaniName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Category;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Location;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString LandmarkId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString VerificationStatus;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString CityEffectSummary;
};


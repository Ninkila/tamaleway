#include "Player/TamaleNeedsComponent.h"
#include "Core/TamaleTimeOfDaySubsystem.h"
#include "GameFramework/Character.h"
#include "GameFramework/CharacterMovementComponent.h"

UTamaleNeedsComponent::UTamaleNeedsComponent()
{
    PrimaryComponentTick.bCanEverTick = true;
}

void UTamaleNeedsComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    DecayTimer += DeltaTime;
    if (DecayTimer < 1.0f) return;
    DecayTimer = 0.0f;

    float ThirstRate = 0.030f;
    float HungerRate = 0.022f;
    float HygieneRate = 0.015f;

    if (const UWorld* World = GetWorld())
    {
        if (const UTamaleTimeOfDaySubsystem* TimeSys = World->GetSubsystem<UTamaleTimeOfDaySubsystem>())
        {
            if (TimeSys->GetWeather() == ETamaleWeather::Heat) ThirstRate *= 1.65f;
            if (TimeSys->GetWeather() == ETamaleWeather::Harmattan) { ThirstRate *= 1.35f; HygieneRate *= 1.25f; }
        }
    }

    if (const ACharacter* OwnerChar = Cast<ACharacter>(GetOwner()))
    {
        const float Speed = OwnerChar->GetVelocity().Size2D();
        if (Speed > 380.0f)
        {
            HungerRate *= 1.45f;
            HygieneRate *= 1.4f;
            Needs.Energy -= 0.045f;
        }
    }

    Needs.Thirst -= ThirstRate;
    Needs.Hunger -= HungerRate;
    Needs.Hygiene -= HygieneRate;
    Needs.Social -= 0.008f;

    const float ComfortTarget = (HomeState.HomeCleanliness * 0.4f) + (Needs.OutfitCleanliness * 0.3f) + (Needs.Hygiene * 0.3f);
    Needs.Comfort += (ComfortTarget - Needs.Comfort) * 0.01f;

    ClampAllNeeds();
    OnNeedsUpdated.Broadcast(Needs, HomeState);
}

void UTamaleNeedsComponent::LoadFromSaveState(const FTamaleNeedsData& InNeeds, const FTamaleHomeStateData& InHome)
{
    Needs = InNeeds;
    HomeState = InHome;
    ClampAllNeeds();
    OnNeedsUpdated.Broadcast(Needs, HomeState);
}

void UTamaleNeedsComponent::ApplySleepRecovery(bool bIsNap)
{
    if (bIsNap)
    {
        Needs.Energy = FMath::Min(100.0f, Needs.Energy + 35.0f);
        Needs.Comfort = FMath::Min(100.0f, Needs.Comfort + 14.0f);
    }
    else
    {
        const float BedMaxEnergy = (HomeState.BedUpgradeLevel >= 2) ? 100.0f : 88.0f;
        Needs.Energy = FMath::Max(Needs.Energy, BedMaxEnergy);
        Needs.Comfort = FMath::Min(100.0f, Needs.Comfort + 28.0f);
        Needs.Hunger -= 10.0f;
        Needs.Thirst -= 12.0f;

        if (HomeState.HangingLaundryCount > 0)
        {
            HomeState.HangingLaundryCount = 0;
        }
    }

    ClampAllNeeds();
    OnNeedsUpdated.Broadcast(Needs, HomeState);
}

void UTamaleNeedsComponent::ApplyHygieneShower()
{
    Needs.Hygiene += 60.0f;
    Needs.Comfort += 18.0f;
    Needs.Energy += 6.0f;
    ClampAllNeeds();
    OnNeedsUpdated.Broadcast(Needs, HomeState);
}

void UTamaleNeedsComponent::ApplyHygieneWashbasin()
{
    Needs.Hygiene += 28.0f;
    Needs.Thirst += 8.0f;
    ClampAllNeeds();
    OnNeedsUpdated.Broadcast(Needs, HomeState);
}

void UTamaleNeedsComponent::ApplyMealOrDrink(float HungerGain, float ThirstGain, float EnergyGain, float ComfortGain, bool bAddDirtyDish)
{
    Needs.Hunger += HungerGain;
    Needs.Thirst += ThirstGain;
    Needs.Energy += EnergyGain;
    Needs.Comfort += ComfortGain;

    if (bAddDirtyDish)
    {
        HomeState.DirtyDishesCount += 1;
        HomeState.HomeCleanliness = FMath::Max(15.0f, HomeState.HomeCleanliness - 3.5f);
    }

    ClampAllNeeds();
    OnNeedsUpdated.Broadcast(Needs, HomeState);
}

void UTamaleNeedsComponent::ApplyCleanHome(bool bWashDishesOnly)
{
    if (bWashDishesOnly)
    {
        HomeState.DirtyDishesCount = 0;
        HomeState.HomeCleanliness = FMath::Min(100.0f, HomeState.HomeCleanliness + 14.0f);
    }
    else
    {
        HomeState.RubbishCount = 0;
        HomeState.HomeCleanliness = FMath::Min(100.0f, HomeState.HomeCleanliness + 24.0f);
        Needs.Energy -= 4.0f;
        Needs.Comfort += 14.0f;
    }

    ClampAllNeeds();
    OnNeedsUpdated.Broadcast(Needs, HomeState);
}

void UTamaleNeedsComponent::ApplyLaundryCycle(bool bWashAndHang, bool bCollectDryClothes)
{
    if (bWashAndHang)
    {
        const int32 Batch = FMath::Max(1, HomeState.DirtyClothesCount);
        HomeState.DirtyClothesCount = 0;
        HomeState.HangingLaundryCount += Batch;
        Needs.Hygiene += 8.0f;
    }
    if (bCollectDryClothes)
    {
        HomeState.HangingLaundryCount = 0;
        Needs.OutfitCleanliness = 100.0f;
        Needs.Comfort += 14.0f;
    }

    ClampAllNeeds();
    OnNeedsUpdated.Broadcast(Needs, HomeState);
}

void UTamaleNeedsComponent::ClampAllNeeds()
{
    Needs.Energy = FMath::Clamp(Needs.Energy, 0.0f, 100.0f);
    Needs.Hygiene = FMath::Clamp(Needs.Hygiene, 0.0f, 100.0f);
    Needs.Hunger = FMath::Clamp(Needs.Hunger, 0.0f, 100.0f);
    Needs.Thirst = FMath::Clamp(Needs.Thirst, 0.0f, 100.0f);
    Needs.Comfort = FMath::Clamp(Needs.Comfort, 0.0f, 100.0f);
    Needs.Social = FMath::Clamp(Needs.Social, 0.0f, 100.0f);
    Needs.OutfitCleanliness = FMath::Clamp(Needs.OutfitCleanliness, 0.0f, 100.0f);
    HomeState.HomeCleanliness = FMath::Clamp(HomeState.HomeCleanliness, 0.0f, 100.0f);
}

#include "World/TamaleHomeStationActor.h"
#include "Components/BoxComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Core/TamaleTimeOfDaySubsystem.h"
#include "Player/TamaleNeedsComponent.h"
#include "Player/TamalePlayerCharacter.h"
#include "Tamale3D.h"

ATamaleHomeStationActor::ATamaleHomeStationActor()
{
    PrimaryActorTick.bCanEverTick = false;

    RootScene = CreateDefaultSubobject<USceneComponent>(TEXT("RootScene"));
    SetRootComponent(RootScene);

    StationMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("StationMesh"));
    StationMesh->SetupAttachment(RootScene);

    InteractVolume = CreateDefaultSubobject<UBoxComponent>(TEXT("InteractVolume"));
    InteractVolume->SetupAttachment(RootScene);
    InteractVolume->SetBoxExtent(FVector(85.0f, 85.0f, 95.0f));
    InteractVolume->SetCollisionResponseToAllChannels(ECR_Ignore);
    InteractVolume->SetCollisionResponseToChannel(ECC_Visibility, ECR_Block);
}

FText ATamaleHomeStationActor::GetInteractionPrompt_Implementation(AActor* Interactor) const
{
    if (!PromptLabel.IsEmpty()) return PromptLabel;

    switch (StationType)
    {
    case EHomeStationType::BedSleep:       return FText::FromString(TEXT("Sleep Until Morning (E)"));
    case EHomeStationType::BathroomShower: return FText::FromString(TEXT("Take Shower (E)"));
    case EHomeStationType::BathroomSink:   return FText::FromString(TEXT("Wash Face & Hands (E)"));
    case EHomeStationType::KitchenStove:   return FText::FromString(TEXT("Cook Ghanaian Meal (E)"));
    case EHomeStationType::KitchenFridge:  return FText::FromString(TEXT("Drink Water / Pantry (E)"));
    case EHomeStationType::KitchenSink:    return FText::FromString(TEXT("Wash Dirty Dishes (E)"));
    case EHomeStationType::CourtyardSweep: return FText::FromString(TEXT("Sweep & Clean House (E)"));
    case EHomeStationType::LaundryWashTub: return FText::FromString(TEXT("Wash Dirty Clothes (E)"));
    case EHomeStationType::Clothesline:    return FText::FromString(TEXT("Collect Dry Laundry (E)"));
    case EHomeStationType::Wardrobe:       return FText::FromString(TEXT("Change Outfit (E)"));
    case EHomeStationType::LivingRoomSofa: return FText::FromString(TEXT("Rest on Sofa (E)"));
    default:                               return FText::FromString(TEXT("Interact (E)"));
    }
}

FText ATamaleHomeStationActor::GetDagbaniSubtitle_Implementation(AActor* Interactor) const
{
    return DagbaniLabel;
}

bool ATamaleHomeStationActor::CanInteract_Implementation(AActor* Interactor) const
{
    return IsValid(Interactor);
}

void ATamaleHomeStationActor::ExecuteInteraction_Implementation(AActor* Interactor)
{
    ATamalePlayerCharacter* PlayerChar = Cast<ATamalePlayerCharacter>(Interactor);
    UTamaleNeedsComponent* Needs = PlayerChar ? PlayerChar->NeedsComponent : nullptr;

    switch (StationType)
    {
    case EHomeStationType::BedSleep:
        SleepWithPreset(Interactor, DefaultWakeUpHour, false);
        break;
    case EHomeStationType::BathroomShower:
        if (Needs) Needs->ApplyHygieneShower();
        if (UWorld* W = GetWorld())
        {
            if (auto* TimeSys = W->GetSubsystem<UTamaleTimeOfDaySubsystem>()) TimeSys->AdvanceMinutes(20.0f);
        }
        break;
    case EHomeStationType::BathroomSink:
        if (Needs) Needs->ApplyHygieneWashbasin();
        if (UWorld* W = GetWorld())
        {
            if (auto* TimeSys = W->GetSubsystem<UTamaleTimeOfDaySubsystem>()) TimeSys->AdvanceMinutes(8.0f);
        }
        break;
    case EHomeStationType::KitchenStove:
        if (Needs) Needs->ApplyMealOrDrink(42.0f, 6.0f, 28.0f, 18.0f, true);
        if (UWorld* W = GetWorld())
        {
            if (auto* TimeSys = W->GetSubsystem<UTamaleTimeOfDaySubsystem>()) TimeSys->AdvanceMinutes(25.0f);
        }
        break;
    case EHomeStationType::KitchenFridge:
        if (Needs) Needs->ApplyMealOrDrink(0.0f, 40.0f, 6.0f, 8.0f, false);
        break;
    case EHomeStationType::KitchenSink:
        if (Needs) Needs->ApplyCleanHome(true);
        break;
    case EHomeStationType::CourtyardSweep:
        if (Needs) Needs->ApplyCleanHome(false);
        break;
    case EHomeStationType::LaundryWashTub:
        if (Needs) Needs->ApplyLaundryCycle(true, false);
        break;
    case EHomeStationType::Clothesline:
        if (Needs) Needs->ApplyLaundryCycle(false, true);
        break;
    case EHomeStationType::LivingRoomSofa:
        if (Needs) Needs->ApplyMealOrDrink(0.0f, 0.0f, 12.0f, 20.0f, false);
        if (UWorld* W = GetWorld())
        {
            if (auto* TimeSys = W->GetSubsystem<UTamaleTimeOfDaySubsystem>()) TimeSys->AdvanceMinutes(30.0f);
        }
        break;
    default:
        break;
    }

    if (PlayerChar)
    {
        PlayerChar->SaveToGameInstanceState();
    }

    OnHomeStationActivated.Broadcast(StationType, Interactor);
    UE_LOG(LogTamale3D, Log, TEXT("Home station activated: %d"), static_cast<int32>(StationType));
}

void ATamaleHomeStationActor::SleepWithPreset(AActor* Interactor, int32 TargetWakeHour, bool bIsNap)
{
    if (UWorld* W = GetWorld())
    {
        if (UTamaleTimeOfDaySubsystem* TimeSys = W->GetSubsystem<UTamaleTimeOfDaySubsystem>())
        {
            TimeSys->SleepUntilHour(TargetWakeHour, bIsNap, 90.0f);
        }
    }
    if (ATamalePlayerCharacter* PlayerChar = Cast<ATamalePlayerCharacter>(Interactor))
    {
        if (PlayerChar->NeedsComponent)
        {
            PlayerChar->NeedsComponent->ApplySleepRecovery(bIsNap);
        }
        PlayerChar->SaveToGameInstanceState();
    }
}

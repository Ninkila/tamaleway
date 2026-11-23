#include "AI/TamaleNpcCharacter.h"
#include "AIController.h"
#include "Components/CapsuleComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"
#include "Core/TamaleTimeOfDaySubsystem.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Navigation/PathFollowingComponent.h"
#include "Player/TamaleNeedsComponent.h"
#include "Player/TamalePlayerCharacter.h"
#include "Tamale3D.h"

ATamaleNpcCharacter::ATamaleNpcCharacter()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.TickInterval = 0.25f; // Low CPU footprint per NPC

    AutoPossessAI = EAutoPossessAI::PlacedInWorldOrSpawned;
    GetCapsuleComponent()->InitCapsuleSize(34.0f, 88.0f);
    GetCharacterMovement()->MaxWalkSpeed = 145.0f;
    GetCharacterMovement()->bOrientRotationToMovement = true;
    bUseControllerRotationYaw = false;

    static ConstructorHelpers::FObjectFinder<UStaticMesh> BodyMesh(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    PlaceholderBody = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("PlaceholderBody"));
    PlaceholderBody->SetupAttachment(GetCapsuleComponent());
    PlaceholderBody->SetStaticMesh(BodyMesh.Object);
    PlaceholderBody->SetRelativeScale3D(FVector(0.55f, 0.45f, 1.72f));
    PlaceholderBody->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    PlaceholderBody->SetCanEverAffectNavigation(false);
}

void ATamaleNpcCharacter::BeginPlay()
{
    Super::BeginPlay();

    if (GetMesh() && GetMesh()->GetSkeletalMeshAsset() && PlaceholderBody)
    {
        PlaceholderBody->SetHiddenInGame(true);
    }
    else if (PlaceholderBody && PlaceholderBody->GetMaterial(0))
    {
        // Muted, varied clothing colour per NPC so they are distinguishable in the greybox.
        const uint32 Hash = GetTypeHash(NpcDisplayName);
        const FLinearColor Cloth = FLinearColor::MakeFromHSV8(static_cast<uint8>(Hash & 0xFF), 150, 190);
        if (UMaterialInstanceDynamic* MID = PlaceholderBody->CreateAndSetMaterialInstanceDynamic(0))
        {
            MID->SetVectorParameterValue(TEXT("Color"), Cloth);
        }
    }

    if (PatrolWaypoints.Num() > 0)
    {
        AdvancePatrol();
    }
}

void ATamaleNpcCharacter::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    APawn* PlayerPawn = UGameplayStatics::GetPlayerPawn(GetWorld(), 0);
    if (PlayerPawn)
    {
        const float DistSq = FVector::DistSquared(GetActorLocation(), PlayerPawn->GetActorLocation());
        const bool bNearby = DistSq <= FMath::Square(FullAiDistanceCm);
        SetActorTickInterval(bNearby ? 0.25f : 1.5f);
        if (!bNearby) return;
    }

    if (PatrolWaypoints.Num() == 0) return;

    AAIController* AIC = Cast<AAIController>(GetController());
    if (AIC && AIC->GetMoveStatus() == EPathFollowingStatus::Idle)
    {
        WaitTimer += DeltaTime;
        if (WaitTimer >= 4.0f)
        {
            WaitTimer = 0.0f;
            AdvancePatrol();
        }
    }
}

void ATamaleNpcCharacter::AdvancePatrol()
{
    if (PatrolWaypoints.Num() == 0) return;
    if (AAIController* AIC = Cast<AAIController>(GetController()))
    {
        const FVector Dest = PatrolWaypoints[CurrentWaypointIndex % PatrolWaypoints.Num()];
        const EPathFollowingRequestResult::Type Result = AIC->MoveToLocation(Dest, 75.0f, true, true, true, false, nullptr, true);
        if (Result == EPathFollowingRequestResult::Failed)
        {
            // No navmesh around this NPC yet (nav is generated around the player): walk straight instead.
            AIC->MoveToLocation(Dest, 75.0f, true, false, false, false, nullptr, true);
        }
        CurrentWaypointIndex = (CurrentWaypointIndex + 1) % PatrolWaypoints.Num();
    }
}

FText ATamaleNpcCharacter::GetInteractionPrompt_Implementation(AActor* Interactor) const
{
    return FText::FromString(FString::Printf(TEXT("Greet %s - %s (E)"), *NpcDisplayName, *NpcRole));
}

FText ATamaleNpcCharacter::GetDagbaniSubtitle_Implementation(AActor* Interactor) const
{
    if (const UWorld* W = GetWorld())
    {
        if (const UTamaleTimeOfDaySubsystem* TimeSys = W->GetSubsystem<UTamaleTimeOfDaySubsystem>())
        {
            const bool bMorningOrAfternoon = TimeSys->GetCurrentPeriod() == ETamaleTimePeriod::Morning
                || TimeSys->GetCurrentPeriod() == ETamaleTimePeriod::Afternoon;
            const FString& Dagbani = bMorningOrAfternoon ? MorningGreetingDagbani : EveningGreetingDagbani;
            const FString& English = bMorningOrAfternoon ? MorningGreetingEnglish : EveningGreetingEnglish;
            if (!Dagbani.IsEmpty())
            {
                return FText::FromString(English.IsEmpty() ? Dagbani : FString::Printf(TEXT("%s\n(%s)"), *Dagbani, *English));
            }

            switch (TimeSys->GetCurrentPeriod())
            {
            case ETamaleTimePeriod::Morning:   return FText::FromString(TEXT("Dasuba! (Good morning!)"));
            case ETamaleTimePeriod::Afternoon: return FText::FromString(TEXT("Wuntanga! (Good afternoon!)"));
            case ETamaleTimePeriod::Evening:
            case ETamaleTimePeriod::Night:     return FText::FromString(TEXT("Zaawuni! (Good evening!)"));
            }
        }
    }
    return FText::FromString(TEXT("Antire!"));
}

bool ATamaleNpcCharacter::CanInteract_Implementation(AActor* Interactor) const
{
    return IsValid(Interactor);
}

void ATamaleNpcCharacter::ExecuteInteraction_Implementation(AActor* Interactor)
{
    if (ATamalePlayerCharacter* PlayerChar = Cast<ATamalePlayerCharacter>(Interactor))
    {
        if (PlayerChar->NeedsComponent)
        {
            PlayerChar->NeedsComponent->Needs.Social = FMath::Clamp(PlayerChar->NeedsComponent->Needs.Social + 12.0f, 0.0f, 100.0f);
        }
    }
    UE_LOG(LogTamale3D, Log, TEXT("Player greeted NPC %s (%s)"), *NpcDisplayName, *GetDagbaniSubtitle_Implementation(Interactor).ToString());
}

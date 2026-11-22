#include "AI/TamaleNpcCharacter.h"
#include "AIController.h"
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
    GetCharacterMovement()->MaxWalkSpeed = 145.0f;
    GetCharacterMovement()->bOrientRotationToMovement = true;
}

void ATamaleNpcCharacter::BeginPlay()
{
    Super::BeginPlay();
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
        AIC->MoveToLocation(Dest, 75.0f, true, true, true, false, nullptr, true);
        CurrentWaypointIndex = (CurrentWaypointIndex + 1) % PatrolWaypoints.Num();
    }
}

FText ATamaleNpcCharacter::GetInteractionPrompt_Implementation(AActor* Interactor) const
{
    return FText::FromString(FString::Printf(TEXT("Greet %s · %s (E)"), *NpcDisplayName, *NpcRole));
}

FText ATamaleNpcCharacter::GetDagbaniSubtitle_Implementation(AActor* Interactor) const
{
    if (const UWorld* W = GetWorld())
    {
        if (const UTamaleTimeOfDaySubsystem* TimeSys = W->GetSubsystem<UTamaleTimeOfDaySubsystem>())
        {
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

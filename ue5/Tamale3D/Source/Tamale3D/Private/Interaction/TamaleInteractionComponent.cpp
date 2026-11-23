#include "Interaction/TamaleInteractionComponent.h"
#include "Interaction/TamaleInteractableInterface.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/Controller.h"
#include "Engine/World.h"

UTamaleInteractionComponent::UTamaleInteractionComponent()
{
    PrimaryComponentTick.bCanEverTick = true;
}

void UTamaleInteractionComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    ScanAccumulator += DeltaTime;
    if (ScanAccumulator >= ScanIntervalSeconds)
    {
        ScanAccumulator = 0.0f;
        PerformScan();
    }
}

void UTamaleInteractionComponent::PerformScan()
{
    AActor* OwnerActor = GetOwner();
    APawn* OwnerPawn = Cast<APawn>(OwnerActor);
    UWorld* World = GetWorld();
    if (!OwnerActor || !World) return;

    FVector ViewLoc = OwnerActor->GetActorLocation() + FVector(0.0f, 0.0f, 60.0f);
    FRotator ViewRot = OwnerActor->GetActorRotation();
    if (OwnerPawn && OwnerPawn->GetController())
    {
        OwnerPawn->GetController()->GetPlayerViewPoint(ViewLoc, ViewRot);
    }

    const FVector Start = OwnerActor->GetActorLocation() + FVector(0.0f, 0.0f, 45.0f);
    const FVector End = Start + ViewRot.Vector() * InteractionRangeCm;

    FCollisionQueryParams Params(SCENE_QUERY_STAT(TamaleInteractScan), false, OwnerActor);
    TArray<FHitResult> Hits;
    const bool bHit = World->SweepMultiByChannel(
        Hits,
        Start,
        End,
        FQuat::Identity,
        ECC_GameTraceChannel1, // "TamaleInteract" (DefaultEngine.ini)
        FCollisionShape::MakeSphere(ScanRadiusCm),
        Params
    );

    AActor* BestCandidate = nullptr;
    if (bHit)
    {
        for (const FHitResult& Hit : Hits)
        {
            AActor* HitActor = Hit.GetActor();
            if (!HitActor) continue;

            if (HitActor->Implements<UTamaleInteractableInterface>())
            {
                if (ITamaleInteractableInterface::Execute_CanInteract(HitActor, OwnerActor))
                {
                    BestCandidate = HitActor;
                    break;
                }
            }
        }
    }

    if (BestCandidate != FocusedActor.Get())
    {
        FocusedActor = BestCandidate;
        if (BestCandidate)
        {
            const FText Prompt = ITamaleInteractableInterface::Execute_GetInteractionPrompt(BestCandidate, OwnerActor);
            const FText Subtitle = ITamaleInteractableInterface::Execute_GetDagbaniSubtitle(BestCandidate, OwnerActor);
            OnFocusChanged.Broadcast(true, Prompt, Subtitle);
        }
        else
        {
            OnFocusChanged.Broadcast(false, FText::GetEmpty(), FText::GetEmpty());
        }
    }
}

bool UTamaleInteractionComponent::TryInteract()
{
    AActor* Target = FocusedActor.Get();
    AActor* OwnerActor = GetOwner();
    if (!Target || !OwnerActor) return false;

    if (Target->Implements<UTamaleInteractableInterface>() &&
        ITamaleInteractableInterface::Execute_CanInteract(Target, OwnerActor))
    {
        ITamaleInteractableInterface::Execute_ExecuteInteraction(Target, OwnerActor);
        PerformScan();
        return true;
    }
    return false;
}

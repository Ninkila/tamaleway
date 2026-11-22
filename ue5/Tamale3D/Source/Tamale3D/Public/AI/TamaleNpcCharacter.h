#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "Interaction/TamaleInteractableInterface.h"
#include "TamaleNpcCharacter.generated.h"

/**
 * Base Tamale citizen NPC with time-of-day Dagbani greeting support,
 * simple NavMesh patrol waypoints, and distance-based AI tick throttling
 * optimized for Intel Core i7 8th Gen laptops.
 */
UCLASS()
class TAMALE3D_API ATamaleNpcCharacter : public ACharacter, public ITamaleInteractableInterface
{
    GENERATED_BODY()

public:
    ATamaleNpcCharacter();

    virtual void Tick(float DeltaTime) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "TamaleNPC")
    FString NpcDisplayName = TEXT("Fuseina");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "TamaleNPC")
    FString NpcRole = TEXT("Changli Neighbour");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "TamaleNPC")
    TArray<FVector> PatrolWaypoints;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "TamaleNPC|Perf")
    float FullAiDistanceCm = 4500.0f;

    virtual FText GetInteractionPrompt_Implementation(AActor* Interactor) const override;
    virtual FText GetDagbaniSubtitle_Implementation(AActor* Interactor) const override;
    virtual bool CanInteract_Implementation(AActor* Interactor) const override;
    virtual void ExecuteInteraction_Implementation(AActor* Interactor) override;

protected:
    virtual void BeginPlay() override;

private:
    int32 CurrentWaypointIndex = 0;
    float WaitTimer = 0.0f;
    float ThrottledCheckTimer = 0.0f;

    void AdvancePatrol();
};

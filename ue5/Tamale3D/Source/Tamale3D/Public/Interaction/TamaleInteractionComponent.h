#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "TamaleInteractionComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(
    FOnInteractableFocusChanged,
    bool, bHasTarget,
    FText, PromptText,
    FText, DagbaniSubtitle
);

/**
 * Modular interaction scanner attached to the player character.
 * Broadcasts contextual prompts cleanly only when facing/near a valid interactable.
 */
UCLASS(ClassGroup=(Tamale), meta=(BlueprintSpawnableComponent))
class TAMALE3D_API UTamaleInteractionComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UTamaleInteractionComponent();

    virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction")
    float InteractionRangeCm = 240.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction")
    float ScanRadiusCm = 42.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction")
    float ScanIntervalSeconds = 0.08f;

    UPROPERTY(BlueprintAssignable, Category = "Interaction")
    FOnInteractableFocusChanged OnFocusChanged;

    UFUNCTION(BlueprintCallable, Category = "Interaction")
    bool TryInteract();

    UFUNCTION(BlueprintPure, Category = "Interaction")
    AActor* GetFocusedActor() const { return FocusedActor.Get(); }

private:
    TWeakObjectPtr<AActor> FocusedActor;
    float ScanAccumulator = 0.0f;

    void PerformScan();
};

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Data/TamaleWorldTypes.h"
#include "Interaction/TamaleInteractableInterface.h"
#include "TamaleHomeStationActor.generated.h"

class UBoxComponent;
class UStaticMeshComponent;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
    FOnHomeStationActivated,
    EHomeStationType, StationType,
    AActor*, Interactor
);

/**
 * Reusable interactive station placed inside the player's Changli home
 * (Bed with wake-up hour selection, Shower, Kitchen Stove, Cleaning area, Laundry tub/clothesline).
 */
UCLASS()
class TAMALE3D_API ATamaleHomeStationActor : public AActor, public ITamaleInteractableInterface
{
    GENERATED_BODY()

public:
    ATamaleHomeStationActor();

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "HomeStation")
    TObjectPtr<USceneComponent> RootScene;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "HomeStation")
    TObjectPtr<UStaticMeshComponent> StationMesh;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "HomeStation")
    TObjectPtr<UBoxComponent> InteractVolume;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HomeStation")
    EHomeStationType StationType = EHomeStationType::BedSleep;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HomeStation")
    FText PromptLabel;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HomeStation")
    FText DagbaniLabel;

    /** Default wake-up hour (0..23) when quick-interacting with Bed; UMG menu can call SleepWithPreset explicitly */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HomeStation|Sleep")
    int32 DefaultWakeUpHour = 7;

    UPROPERTY(BlueprintAssignable, Category = "HomeStation")
    FOnHomeStationActivated OnHomeStationActivated;

    UFUNCTION(BlueprintCallable, Category = "HomeStation|Sleep")
    void SleepWithPreset(AActor* Interactor, int32 TargetWakeHour, bool bIsNap);

    virtual FText GetInteractionPrompt_Implementation(AActor* Interactor) const override;
    virtual FText GetDagbaniSubtitle_Implementation(AActor* Interactor) const override;
    virtual bool CanInteract_Implementation(AActor* Interactor) const override;
    virtual void ExecuteInteraction_Implementation(AActor* Interactor) override;
};

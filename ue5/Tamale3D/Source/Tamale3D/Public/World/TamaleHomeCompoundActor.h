#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TamaleHomeCompoundActor.generated.h"

class UBoxComponent;

/**
 * Physical Changli Residential Compound anchor connecting the player's
 * walled yard, gate, Polytank/laundry exterior, and walkable indoor rooms
 * (Living Room, Kitchen, Bathroom, Bedroom) seamlessly to Changli Avenue.
 */
UCLASS()
class TAMALE3D_API ATamaleHomeCompoundActor : public AActor
{
    GENERATED_BODY()

public:
    ATamaleHomeCompoundActor();

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Compound")
    TObjectPtr<USceneComponent> CompoundRoot;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Compound")
    TObjectPtr<UBoxComponent> CompoundPropertyBounds;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Compound")
    FString DistrictLabel = TEXT("Changli - Jakarayili Residential Quarter");

    /** South gate world offset connecting straight out to Changli Residential Avenue */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Compound")
    FVector GateRoadApproachOffsetCm = FVector(0.0f, 800.0f, 0.0f);

    UFUNCTION(BlueprintPure, Category = "Compound")
    FVector GetRoadApproachWorldLocation() const;

protected:
    virtual void BeginPlay() override;

    UFUNCTION()
    void OnPropertyOverlapBegin(
        UPrimitiveComponent* OverlappedComp,
        AActor* OtherActor,
        UPrimitiveComponent* OtherComp,
        int32 OtherBodyIndex,
        bool bFromSweep,
        const FHitResult& SweepResult
    );
};

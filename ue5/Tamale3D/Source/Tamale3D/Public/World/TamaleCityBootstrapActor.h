#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Data/TamaleWorldTypes.h"
#include "TamaleCityBootstrapActor.generated.h"

class UStaticMesh;
class UStaticMeshComponent;
class UMaterialInterface;
class UMaterialInstanceDynamic;
class UTextRenderComponent;
class UTamaleDataRegistrySubsystem;

/**
 * Builds a playable greybox of Tamale at runtime from the exported data (roads, building
 * footprints, landmarks, the Changli player compound with all home stations, NPCs, sky).
 *
 * Purpose: make Batch 1/2 playable and testable in ANY empty level without hand-placing
 * assets. Every piece is generated from the same data the web game uses, so positions match.
 * Final art replaces this progressively (see MIGRATION_MASTER_TRACKER.md); disable
 * bAutoBuild on a placed instance once a level is authored by hand.
 */
UCLASS()
class TAMALE3D_API ATamaleCityBootstrapActor : public AActor
{
    GENERATED_BODY()

public:
    ATamaleCityBootstrapActor();

    virtual void Tick(float DeltaSeconds) override;

    /** Generates the city. Safe to call more than once (only builds the first time). */
    UFUNCTION(BlueprintCallable, Category = "Tamale|World")
    void BuildGreyboxCity();

    UFUNCTION(BlueprintPure, Category = "Tamale|World")
    bool IsBuilt() const { return bBuilt; }

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tamale|World")
    bool bAutoBuild = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tamale|World")
    bool bSpawnSkyAndSunIfMissing = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tamale|World")
    bool bBuildPlayerCompound = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tamale|World")
    bool bSpawnNpcs = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tamale|World")
    bool bShowLabels = true;

    /** Extra ground around the furthest road/building. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tamale|World")
    float GroundMarginCm = 6000.0f;

    /** Labels further away than this are hidden (cheap culling for text). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tamale|World")
    float LabelVisibleDistanceCm = 9000.0f;

protected:
    virtual void BeginPlay() override;

    UPROPERTY(VisibleAnywhere, Category = "Tamale|World")
    TObjectPtr<USceneComponent> CityRoot;

    UPROPERTY()
    TObjectPtr<UStaticMesh> CubeMesh;

    UPROPERTY()
    TObjectPtr<UStaticMesh> CylinderMesh;

    UPROPERTY()
    TObjectPtr<UMaterialInterface> ShapeMaterial;

private:
    bool bBuilt = false;
    float LabelUpdateAccumulator = 0.0f;

    UPROPERTY(Transient)
    TArray<TObjectPtr<UTextRenderComponent>> Labels;

    UPROPERTY(Transient)
    TMap<int32, TObjectPtr<UMaterialInstanceDynamic>> MaterialCache;

    UMaterialInstanceDynamic* GetColorMaterial(const FLinearColor& Color);

    UStaticMeshComponent* AddShape(UStaticMesh* Mesh, const FVector& BaseCenterCm, const FVector& SizeCm, float YawDegrees,
                                   const FLinearColor& Color, bool bCollide);
    UTextRenderComponent* AddLabel(const FString& Text, const FVector& WorldLocation, float WorldSize, const FColor& Color);

    void SpawnSkyAndSun();
    void BuildGround(const UTamaleDataRegistrySubsystem& Data);
    void BuildRoads(const UTamaleDataRegistrySubsystem& Data);
    void BuildBuildings(const UTamaleDataRegistrySubsystem& Data);
    void BuildLandmarkMarkers(const UTamaleDataRegistrySubsystem& Data);
    void BuildPlayerCompound(const UTamaleDataRegistrySubsystem& Data);
    void SpawnNpcs(const UTamaleDataRegistrySubsystem& Data);

    void AddWallSegment(const FVector2D& From, const FVector2D& To, float HeightCm, float ThicknessCm, float BaseZ, const FLinearColor& Color);
    void SpawnHomeStation(EHomeStationType Type, const FVector& BaseLocation, const FVector& SizeCm, float YawDegrees,
                          const FLinearColor& Color, const FString& Prompt, const FString& DagbaniLabel);

    void UpdateLabels();
};

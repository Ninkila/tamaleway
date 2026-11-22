#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TamaleRoadSplineActor.generated.h"

class USplineComponent;
class USplineMeshComponent;
class UStaticMesh;

/**
 * Modular spline-based connected road segment for Tamale streets, sidewalks,
 * and compound access lanes. Snaps spline points cleanly onto terrain so roads
 * never float above the ground or cut abruptly.
 */
UCLASS()
class TAMALE3D_API ATamaleRoadSplineActor : public AActor
{
    GENERATED_BODY()

public:
    ATamaleRoadSplineActor();

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Road")
    TObjectPtr<USplineComponent> RoadSpline;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Road")
    FName RoadId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Road")
    FText RoadDisplayName;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Road")
    float RoadWidthCm = 750.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Road")
    float SidewalkWidthCm = 180.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Road")
    float SpeedLimitKmh = 50.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Road|Meshes")
    TObjectPtr<UStaticMesh> RoadSegmentMesh;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Road|Meshes")
    float SegmentSpacingCm = 500.0f;

    /** Projects all spline control points downward onto static terrain with +3cm roadbed clearance */
    UFUNCTION(CallInEditor, BlueprintCallable, Category = "Road")
    void SnapSplinePointsToGround();

    /** Rebuilds USplineMeshComponent strips along the spline */
    UFUNCTION(CallInEditor, BlueprintCallable, Category = "Road")
    void RebuildRoadMeshes();

protected:
    virtual void OnConstruction(const FTransform& Transform) override;

private:
    UPROPERTY(Transient)
    TArray<TObjectPtr<USplineMeshComponent>> GeneratedMeshes;
};

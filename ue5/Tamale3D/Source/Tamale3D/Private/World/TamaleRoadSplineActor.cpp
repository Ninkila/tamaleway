#include "World/TamaleRoadSplineActor.h"
#include "Components/SplineComponent.h"
#include "Components/SplineMeshComponent.h"
#include "Engine/World.h"

ATamaleRoadSplineActor::ATamaleRoadSplineActor()
{
    PrimaryActorTick.bCanEverTick = false;

    RoadSpline = CreateDefaultSubobject<USplineComponent>(TEXT("RoadSpline"));
    SetRootComponent(RoadSpline);
    RoadSpline->SetClosedLoop(false);
}

void ATamaleRoadSplineActor::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform);
    RebuildRoadMeshes();
}

void ATamaleRoadSplineActor::SnapSplinePointsToGround()
{
    UWorld* World = GetWorld();
    if (!World || !RoadSpline) return;

    const int32 NumPts = RoadSpline->GetNumberOfSplinePoints();
    FCollisionQueryParams Params(SCENE_QUERY_STAT(RoadGroundSnap), false, this);

    for (int32 i = 0; i < NumPts; ++i)
    {
        const FVector WorldPt = RoadSpline->GetLocationAtSplinePoint(i, ESplineCoordinateSpace::World);
        const FVector TraceStart = WorldPt + FVector(0.0f, 0.0f, 5000.0f);
        const FVector TraceEnd = WorldPt - FVector(0.0f, 0.0f, 5000.0f);

        FHitResult Hit;
        if (World->LineTraceSingleByChannel(Hit, TraceStart, TraceEnd, ECC_WorldStatic, Params))
        {
            const FVector GroundedPt = Hit.ImpactPoint + FVector(0.0f, 0.0f, 3.0f);
            RoadSpline->SetLocationAtSplinePoint(i, GroundedPt, ESplineCoordinateSpace::World, false);
        }
    }

    RoadSpline->UpdateSpline();
    RebuildRoadMeshes();
}

void ATamaleRoadSplineActor::RebuildRoadMeshes()
{
    for (USplineMeshComponent* Comp : GeneratedMeshes)
    {
        if (Comp) Comp->DestroyComponent();
    }
    GeneratedMeshes.Empty();

    if (!RoadSpline || !RoadSegmentMesh) return;

    const float SplineLen = RoadSpline->GetSplineLength();
    const int32 Steps = FMath::Max(1, FMath::FloorToInt(SplineLen / FMath::Max(100.0f, SegmentSpacingCm)));
    const float StepDist = SplineLen / static_cast<float>(Steps);

    for (int32 i = 0; i < Steps; ++i)
    {
        const float D0 = i * StepDist;
        const float D1 = (i + 1) * StepDist;

        const FVector P0 = RoadSpline->GetLocationAtDistanceAlongSpline(D0, ESplineCoordinateSpace::Local);
        const FVector T0 = RoadSpline->GetTangentAtDistanceAlongSpline(D0, ESplineCoordinateSpace::Local).GetClampedToMaxSize(StepDist);
        const FVector P1 = RoadSpline->GetLocationAtDistanceAlongSpline(D1, ESplineCoordinateSpace::Local);
        const FVector T1 = RoadSpline->GetTangentAtDistanceAlongSpline(D1, ESplineCoordinateSpace::Local).GetClampedToMaxSize(StepDist);

        USplineMeshComponent* MeshComp = NewObject<USplineMeshComponent>(this);
        MeshComp->SetMobility(EComponentMobility::Static);
        MeshComp->SetStaticMesh(RoadSegmentMesh);
        MeshComp->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
        MeshComp->SetCollisionResponseToAllChannels(ECR_Block);
        MeshComp->SetForwardAxis(ESplineMeshAxis::X);
        MeshComp->SetStartAndEnd(P0, T0, P1, T1, true);
        MeshComp->SetStartScale(FVector2D(RoadWidthCm / 100.0f, 1.0f));
        MeshComp->SetEndScale(FVector2D(RoadWidthCm / 100.0f, 1.0f));
        MeshComp->AttachToComponent(RoadSpline, FAttachmentTransformRules::KeepRelativeTransform);
        MeshComp->RegisterComponent();

        GeneratedMeshes.Add(MeshComp);
    }
}

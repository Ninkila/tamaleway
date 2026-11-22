#include "World/TamaleHomeCompoundActor.h"
#include "Components/BoxComponent.h"
#include "Player/TamalePlayerCharacter.h"
#include "Tamale3D.h"

ATamaleHomeCompoundActor::ATamaleHomeCompoundActor()
{
    PrimaryActorTick.bCanEverTick = false;

    CompoundRoot = CreateDefaultSubobject<USceneComponent>(TEXT("CompoundRoot"));
    SetRootComponent(CompoundRoot);

    CompoundPropertyBounds = CreateDefaultSubobject<UBoxComponent>(TEXT("CompoundPropertyBounds"));
    CompoundPropertyBounds->SetupAttachment(CompoundRoot);
    CompoundPropertyBounds->SetBoxExtent(FVector(750.0f, 600.0f, 250.0f));
    CompoundPropertyBounds->SetCollisionProfileName(TEXT("Trigger"));
}

void ATamaleHomeCompoundActor::BeginPlay()
{
    Super::BeginPlay();
    if (CompoundPropertyBounds)
    {
        CompoundPropertyBounds->OnComponentBeginOverlap.AddDynamic(this, &ATamaleHomeCompoundActor::OnPropertyOverlapBegin);
    }
}

FVector ATamaleHomeCompoundActor::GetRoadApproachWorldLocation() const
{
    return GetActorTransform().TransformPosition(GateRoadApproachOffsetCm);
}

void ATamaleHomeCompoundActor::OnPropertyOverlapBegin(
    UPrimitiveComponent* OverlappedComp,
    AActor* OtherActor,
    UPrimitiveComponent* OtherComp,
    int32 OtherBodyIndex,
    bool bFromSweep,
    const FHitResult& SweepResult)
{
    if (Cast<ATamalePlayerCharacter>(OtherActor))
    {
        UE_LOG(LogTamale3D, Log, TEXT("Player entered Changli Compound Property (%s)"), *DistrictLabel);
    }
}

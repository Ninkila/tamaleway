#include "World/TamaleCityBootstrapActor.h"

#include "AI/TamaleNpcCharacter.h"
#include "Camera/PlayerCameraManager.h"
#include "Components/BoxComponent.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Components/SkyAtmosphereComponent.h"
#include "Components/SkyLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "Data/TamaleDataRegistrySubsystem.h"
#include "Engine/CollisionProfile.h"
#include "Engine/DirectionalLight.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"
#include "Tamale3D.h"
#include "UObject/ConstructorHelpers.h"
#include "World/TamaleHomeStationActor.h"

namespace TamaleGreybox
{
    // Palette for the greybox. Kept muted so it reads as "blockout", not final art.
    const FLinearColor Laterite(0.42f, 0.22f, 0.12f);
    const FLinearColor Asphalt(0.045f, 0.045f, 0.05f);
    const FLinearColor LateriteShoulder(0.30f, 0.17f, 0.10f);
    const FLinearColor LandmarkClay(0.62f, 0.38f, 0.24f);
    const FLinearColor CompoundWall(0.80f, 0.72f, 0.58f);
    const FLinearColor Cement(0.55f, 0.55f, 0.53f);
    const FLinearColor ZincRoof(0.42f, 0.45f, 0.48f);
    const FLinearColor Wood(0.36f, 0.22f, 0.12f);
    const FLinearColor PolytankBlack(0.03f, 0.03f, 0.03f);

    static FLinearColor FromHex(const FString& Hex, const FLinearColor& Fallback)
    {
        if (Hex.Len() < 7 || !Hex.StartsWith(TEXT("#")))
        {
            return Fallback;
        }
        return FLinearColor::FromSRGBColor(FColor::FromHex(Hex));
    }
}

ATamaleCityBootstrapActor::ATamaleCityBootstrapActor()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.TickInterval = 0.1f;

    CityRoot = CreateDefaultSubobject<USceneComponent>(TEXT("CityRoot"));
    CityRoot->SetMobility(EComponentMobility::Static);
    SetRootComponent(CityRoot);

    // Engine basic shapes ship with every UE install; hard references so they are cooked into packaged builds.
    static ConstructorHelpers::FObjectFinder<UStaticMesh> CubeFinder(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> CylinderFinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    static ConstructorHelpers::FObjectFinder<UMaterialInterface> MaterialFinder(TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
    CubeMesh = CubeFinder.Object;
    CylinderMesh = CylinderFinder.Object;
    ShapeMaterial = MaterialFinder.Object;
}

void ATamaleCityBootstrapActor::BeginPlay()
{
    Super::BeginPlay();
    if (bAutoBuild)
    {
        BuildGreyboxCity();
    }
}

void ATamaleCityBootstrapActor::BuildGreyboxCity()
{
    if (bBuilt)
    {
        return;
    }

    UGameInstance* GI = GetGameInstance();
    const UTamaleDataRegistrySubsystem* Data = GI ? GI->GetSubsystem<UTamaleDataRegistrySubsystem>() : nullptr;
    if (!Data || !Data->IsDataLoaded())
    {
        UE_LOG(LogTamale3D, Error, TEXT("City bootstrap: world data not loaded (Content/DataTables/*.json missing?) - nothing built."));
        return;
    }
    if (!CubeMesh || !CylinderMesh || !ShapeMaterial)
    {
        UE_LOG(LogTamale3D, Error, TEXT("City bootstrap: engine basic shapes not found - nothing built."));
        return;
    }

    bBuilt = true;
    const double StartSeconds = FPlatformTime::Seconds();

    if (bSpawnSkyAndSunIfMissing)
    {
        SpawnSkyAndSun();
    }
    BuildGround(*Data);
    BuildRoads(*Data);
    BuildBuildings(*Data);
    BuildLandmarkMarkers(*Data);
    if (bBuildPlayerCompound)
    {
        BuildPlayerCompound(*Data);
    }
    if (bSpawnNpcs)
    {
        SpawnNpcs(*Data);
    }

    UE_LOG(LogTamale3D, Log, TEXT("City bootstrap: built %d roads, %d buildings, %d labels in %.1f ms"),
        Data->Roads.Num(), Data->Buildings.Num(), Labels.Num(), (FPlatformTime::Seconds() - StartSeconds) * 1000.0);
}

// ---------------------------------------------------------------------------------------------
// Primitive helpers

UMaterialInstanceDynamic* ATamaleCityBootstrapActor::GetColorMaterial(const FLinearColor& Color)
{
    const int32 Key = static_cast<int32>(Color.ToFColor(false).ToPackedRGBA());
    if (TObjectPtr<UMaterialInstanceDynamic>* Found = MaterialCache.Find(Key))
    {
        return *Found;
    }
    UMaterialInstanceDynamic* MID = UMaterialInstanceDynamic::Create(ShapeMaterial, this);
    MID->SetVectorParameterValue(TEXT("Color"), Color);
    MaterialCache.Add(Key, MID);
    return MID;
}

UStaticMeshComponent* ATamaleCityBootstrapActor::AddShape(UStaticMesh* Mesh, const FVector& BaseCenterCm, const FVector& SizeCm,
                                                          float YawDegrees, const FLinearColor& Color, bool bCollide)
{
    UStaticMeshComponent* Comp = NewObject<UStaticMeshComponent>(this);
    Comp->SetMobility(EComponentMobility::Static);
    Comp->SetupAttachment(CityRoot);
    Comp->SetStaticMesh(Mesh);
    // Basic shapes are 100 cm and centred, so lift by half the height to sit on BaseCenterCm.
    Comp->SetRelativeLocationAndRotation(BaseCenterCm + FVector(0.0, 0.0, SizeCm.Z * 0.5), FRotator(0.0f, YawDegrees, 0.0f));
    Comp->SetRelativeScale3D(SizeCm / 100.0);
    Comp->SetMaterial(0, GetColorMaterial(Color));
    Comp->SetCollisionProfileName(bCollide ? UCollisionProfile::BlockAll_ProfileName : UCollisionProfile::NoCollision_ProfileName);
    Comp->SetCanEverAffectNavigation(bCollide);
    Comp->RegisterComponent();
    AddInstanceComponent(Comp);
    return Comp;
}

UTextRenderComponent* ATamaleCityBootstrapActor::AddLabel(const FString& Text, const FVector& WorldLocation, float WorldSize, const FColor& Color)
{
    if (!bShowLabels || Text.IsEmpty())
    {
        return nullptr;
    }
    UTextRenderComponent* Label = NewObject<UTextRenderComponent>(this);
    Label->SetMobility(EComponentMobility::Movable);
    Label->SetupAttachment(CityRoot);
    Label->SetRelativeLocation(WorldLocation);
    Label->SetText(FText::FromString(Text));
    Label->SetWorldSize(WorldSize);
    Label->SetHorizontalAlignment(EHTA_Center);
    Label->SetVerticalAlignment(EVRTA_TextBottom);
    Label->SetTextRenderColor(Color);
    Label->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Label->SetCastShadow(false);
    Label->RegisterComponent();
    AddInstanceComponent(Label);
    Labels.Add(Label);
    return Label;
}

void ATamaleCityBootstrapActor::AddWallSegment(const FVector2D& From, const FVector2D& To, float HeightCm, float ThicknessCm,
                                               float BaseZ, const FLinearColor& Color)
{
    const FVector2D Delta = To - From;
    const double Length = Delta.Size();
    if (Length < 1.0)
    {
        return;
    }
    const FVector2D Mid = (From + To) * 0.5;
    const float Yaw = FMath::RadiansToDegrees(FMath::Atan2(Delta.Y, Delta.X));
    AddShape(CubeMesh, FVector(Mid.X, Mid.Y, BaseZ), FVector(Length, ThicknessCm, HeightCm), Yaw, Color, true);
}

// ---------------------------------------------------------------------------------------------
// World pieces

void ATamaleCityBootstrapActor::SpawnSkyAndSun()
{
    UWorld* World = GetWorld();
    if (TActorIterator<ADirectionalLight>(World))
    {
        return; // the level already has a sun; assume it is lit by hand
    }

    FActorSpawnParameters Params;
    Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
    if (ADirectionalLight* Sun = World->SpawnActor<ADirectionalLight>(FVector(0.0, 0.0, 2000.0), FRotator(-50.0f, 180.0f, 0.0f), Params))
    {
        Sun->GetRootComponent()->SetMobility(EComponentMobility::Movable);
        if (UDirectionalLightComponent* SunLight = Cast<UDirectionalLightComponent>(Sun->GetLightComponent()))
        {
            SunLight->SetAtmosphereSunLight(true);
            SunLight->SetIntensity(10.0f);
        }
    }

    USkyAtmosphereComponent* Atmosphere = NewObject<USkyAtmosphereComponent>(this);
    Atmosphere->SetupAttachment(CityRoot);
    Atmosphere->RegisterComponent();
    AddInstanceComponent(Atmosphere);

    USkyLightComponent* SkyLight = NewObject<USkyLightComponent>(this);
    SkyLight->SetMobility(EComponentMobility::Movable);
    SkyLight->bRealTimeCapture = true;
    SkyLight->SetupAttachment(CityRoot);
    SkyLight->RegisterComponent();
    AddInstanceComponent(SkyLight);
    SkyLight->RecaptureSky();

    UExponentialHeightFogComponent* Fog = NewObject<UExponentialHeightFogComponent>(this);
    Fog->SetMobility(EComponentMobility::Movable);
    Fog->SetFogDensity(0.012f);
    Fog->SetFogHeightFalloff(0.12f);
    Fog->SetFogInscatteringColor(FLinearColor(0.75f, 0.62f, 0.45f)); // dusty savannah tint
    Fog->SetupAttachment(CityRoot);
    Fog->RegisterComponent();
    AddInstanceComponent(Fog);
}

void ATamaleCityBootstrapActor::BuildGround(const UTamaleDataRegistrySubsystem& Data)
{
    const FBox2D Bounds = Data.GetWorldBounds2D().ExpandBy(GroundMarginCm);
    const FVector2D Center = Bounds.GetCenter();
    const FVector2D Size = Bounds.GetSize();
    // Top surface at Z = 0.
    AddShape(CubeMesh, FVector(Center.X, Center.Y, -100.0), FVector(Size.X, Size.Y, 100.0), 0.0f, TamaleGreybox::Laterite, true);
}

void ATamaleCityBootstrapActor::BuildRoads(const UTamaleDataRegistrySubsystem& Data)
{
    int32 Index = 0;
    for (const FTamaleRoadRow& Road : Data.Roads)
    {
        const FBox2D Footprint = Road.GetFootprint2D();
        const FVector2D Center = Footprint.GetCenter();
        const FVector2D Size = Footprint.GetSize();
        const bool bLaterite = Road.SurfaceType.Contains(TEXT("Laterite"));
        // 8 cm roadbed; a tiny per-road offset stops coplanar flicker where roads cross.
        const double BaseZ = -2.0 + 0.15 * (Index++ % 8);
        AddShape(CubeMesh, FVector(Center.X, Center.Y, BaseZ), FVector(Size.X, Size.Y, 10.0), 0.0f,
                 bLaterite ? TamaleGreybox::LateriteShoulder : TamaleGreybox::Asphalt, true);

        // Name plate at the western/northern end so streets are identifiable while testing.
        const FVector LabelPos = Road.IsEastWest()
            ? FVector(Footprint.Min.X + 600.0, Center.Y, 30.0)
            : FVector(Center.X, Footprint.Min.Y + 600.0, 30.0);
        AddLabel(Road.DisplayName, LabelPos, 90.0f, FColor(255, 236, 170));
    }
}

void ATamaleCityBootstrapActor::BuildBuildings(const UTamaleDataRegistrySubsystem& Data)
{
    for (const FTamaleBuildingRow& B : Data.Buildings)
    {
        if (bBuildPlayerCompound && B.LandmarkId == TEXT("player_home"))
        {
            continue; // built in detail by BuildPlayerCompound
        }

        const bool bCylinder = B.Shape == TEXT("Cylinder");
        const FLinearColor Default = B.Category == TEXT("Landmark") ? TamaleGreybox::LandmarkClay : TamaleGreybox::CompoundWall;
        const FLinearColor Wall = TamaleGreybox::FromHex(B.WallColorHex, Default);
        const FLinearColor Accent = TamaleGreybox::FromHex(B.AccentColorHex, TamaleGreybox::ZincRoof);
        const FVector Base(B.CenterLocationCm.X, B.CenterLocationCm.Y, 0.0);

        AddShape(bCylinder ? CylinderMesh.Get() : CubeMesh.Get(), Base, B.SizeCm, B.YawDegrees, Wall, true);
        if (!bCylinder)
        {
            // Overhanging roof slab in the accent colour.
            AddShape(CubeMesh, Base + FVector(0.0, 0.0, B.SizeCm.Z), FVector(B.SizeCm.X + 40.0, B.SizeCm.Y + 40.0, 18.0), B.YawDegrees, Accent, true);
        }

        if (B.Category != TEXT("House") && !B.BuildingId.StartsWith(TEXT("lmcyl_central_mosque_minaret")))
        {
            AddLabel(B.DisplayName, Base + FVector(0.0, 0.0, B.SizeCm.Z + 120.0), B.Category == TEXT("Shop") ? 70.0f : 140.0f, FColor::White);
        }
    }
}

void ATamaleCityBootstrapActor::BuildLandmarkMarkers(const UTamaleDataRegistrySubsystem& Data)
{
    // Landmarks that have no building footprint still need to be findable: a post + label.
    TSet<FString> Covered;
    for (const FTamaleBuildingRow& B : Data.Buildings)
    {
        if (!B.LandmarkId.IsEmpty()) Covered.Add(B.LandmarkId);
    }

    for (const FTamaleLandmarkRow& L : Data.Landmarks)
    {
        if (Covered.Contains(L.LandmarkId) || L.LandmarkId == TEXT("player_home"))
        {
            continue;
        }
        const FVector Base(L.LocationCm.X, L.LocationCm.Y, 0.0);
        const FBox2D PostBox(FVector2D(Base) - FVector2D(40.0), FVector2D(Base) + FVector2D(40.0));
        const bool bOnRoad = Data.OverlapsAnyRoad(PostBox);
        if (!bOnRoad)
        {
            AddShape(CylinderMesh, Base, FVector(40.0, 40.0, 450.0), 0.0f, TamaleGreybox::LandmarkClay, true);
        }
        FString Text = L.DisplayName;
        if (L.bIsRepresentativeFictional)
        {
            Text += TEXT(" *"); // * = representative location, not a real named business
        }
        AddLabel(Text, Base + FVector(0.0, 0.0, bOnRoad ? 650.0 : 560.0), 130.0f, FColor(255, 214, 140));
    }
}

void ATamaleCityBootstrapActor::BuildPlayerCompound(const UTamaleDataRegistrySubsystem& Data)
{
    // Footprint from the web layout (player_home: 15 m x 12 m, gate facing Residential Estate Avenue to the south).
    FVector Center(2000.0, 8100.0, 0.0);
    FVector Size(1500.0, 1200.0, 620.0);
    if (const FTamaleBuildingRow* Footprint = Data.Buildings.FindByPredicate([](const FTamaleBuildingRow& B) { return B.LandmarkId == TEXT("player_home"); }))
    {
        Center = FVector(Footprint->CenterLocationCm.X, Footprint->CenterLocationCm.Y, 0.0);
        Size = Footprint->SizeCm;
    }

    const double MinX = Center.X - Size.X * 0.5;
    const double MaxX = Center.X + Size.X * 0.5;
    const double MinY = Center.Y - Size.Y * 0.5; // north
    const double MaxY = Center.Y + Size.Y * 0.5; // south (gate side)
    const float WallH = 240.0f;
    const float WallT = 20.0f;
    const double GateHalf = 160.0;

    // Perimeter wall with a 3.2 m gate in the south wall.
    AddWallSegment({MinX, MinY}, {MaxX, MinY}, WallH, WallT, 0.0f, TamaleGreybox::CompoundWall);
    AddWallSegment({MinX, MinY}, {MinX, MaxY}, WallH, WallT, 0.0f, TamaleGreybox::CompoundWall);
    AddWallSegment({MaxX, MinY}, {MaxX, MaxY}, WallH, WallT, 0.0f, TamaleGreybox::CompoundWall);
    AddWallSegment({MinX, MaxY}, {Center.X - GateHalf, MaxY}, WallH, WallT, 0.0f, TamaleGreybox::CompoundWall);
    AddWallSegment({Center.X + GateHalf, MaxY}, {MaxX, MaxY}, WallH, WallT, 0.0f, TamaleGreybox::CompoundWall);
    // Gate posts
    AddShape(CubeMesh, FVector(Center.X - GateHalf - 15.0, MaxY, 0.0), FVector(40.0, 40.0, 270.0), 0.0f, TamaleGreybox::Cement, true);
    AddShape(CubeMesh, FVector(Center.X + GateHalf + 15.0, MaxY, 0.0), FVector(40.0, 40.0, 270.0), 0.0f, TamaleGreybox::Cement, true);

    // House strip along the north wall: Bedroom | Living | Kitchen | Bathroom, each with a door onto the courtyard.
    const double HouseDepth = FMath::Min(480.0, Size.Y * 0.42);
    const double FrontY = MinY + HouseDepth;
    const double Width = Size.X;
    const double Splits[] = { 0.0, 0.27, 0.60, 0.81, 1.0 };
    const TCHAR* RoomNames[] = { TEXT("Bedroom"), TEXT("Living Room"), TEXT("Kitchen"), TEXT("Bathroom") };
    const double DoorHalf = 55.0;

    AddShape(CubeMesh, FVector(Center.X, MinY + HouseDepth * 0.5, 0.0), FVector(Width, HouseDepth, 4.0), 0.0f, TamaleGreybox::Cement, true); // floor
    for (int32 Room = 0; Room < 4; ++Room)
    {
        const double X0 = MinX + Width * Splits[Room];
        const double X1 = MinX + Width * Splits[Room + 1];
        const double DoorX = (X0 + X1) * 0.5;
        AddWallSegment({X0, FrontY}, {DoorX - DoorHalf, FrontY}, WallH, WallT, 0.0f, TamaleGreybox::CompoundWall);
        AddWallSegment({DoorX + DoorHalf, FrontY}, {X1, FrontY}, WallH, WallT, 0.0f, TamaleGreybox::CompoundWall);
        // Lintel above the door
        AddWallSegment({DoorX - DoorHalf, FrontY}, {DoorX + DoorHalf, FrontY}, 30.0f, WallT, 210.0f, TamaleGreybox::CompoundWall);
        if (Room > 0)
        {
            AddWallSegment({X0, MinY}, {X0, FrontY}, WallH, WallT, 0.0f, TamaleGreybox::CompoundWall);
        }
        AddLabel(RoomNames[Room], FVector(DoorX, FrontY + 30.0, 250.0), 32.0f, FColor(250, 250, 240));
    }
    // Zinc roof over the house strip (camera spring arm pulls in underneath it indoors).
    AddShape(CubeMesh, FVector(Center.X, MinY + HouseDepth * 0.5 + 20.0, WallH), FVector(Width + 40.0, HouseDepth + 80.0, 14.0), 0.0f, TamaleGreybox::ZincRoof, true);

    const auto RoomX = [&](int32 Room, double Fraction) { return MinX + Width * (Splits[Room] + (Splits[Room + 1] - Splits[Room]) * Fraction); };
    const double BackY = MinY + WallT + 10.0;

    // Bedroom
    SpawnHomeStation(EHomeStationType::BedSleep, FVector(RoomX(0, 0.45), BackY + 75.0, 4.0), FVector(200.0, 140.0, 55.0), 0.0f, TamaleGreybox::Wood, TEXT(""), TEXT(""));
    SpawnHomeStation(EHomeStationType::Wardrobe, FVector(MinX + WallT + 35.0, FrontY - 110.0, 4.0), FVector(60.0, 120.0, 200.0), 0.0f, TamaleGreybox::Wood, TEXT(""), TEXT(""));
    // Living room
    SpawnHomeStation(EHomeStationType::LivingRoomSofa, FVector(RoomX(1, 0.5), BackY + 45.0, 4.0), FVector(210.0, 85.0, 80.0), 0.0f, FLinearColor(0.20f, 0.28f, 0.45f), TEXT(""), TEXT(""));
    // Kitchen: stove, sink, fridge along the back wall. "Bindirigu" (food) and "Kom" (water) are verified lexicon terms.
    SpawnHomeStation(EHomeStationType::KitchenStove, FVector(RoomX(2, 0.2), BackY + 35.0, 4.0), FVector(80.0, 60.0, 90.0), 0.0f, TamaleGreybox::Cement, TEXT(""), TEXT("Bindirigu (Food)"));
    SpawnHomeStation(EHomeStationType::KitchenSink, FVector(RoomX(2, 0.52), BackY + 30.0, 4.0), FVector(90.0, 55.0, 88.0), 0.0f, FLinearColor(0.75f, 0.75f, 0.78f), TEXT(""), TEXT(""));
    SpawnHomeStation(EHomeStationType::KitchenFridge, FVector(RoomX(2, 0.84), BackY + 40.0, 4.0), FVector(70.0, 70.0, 180.0), 0.0f, FLinearColor(0.9f, 0.9f, 0.92f), TEXT(""), TEXT("Kom (Water)"));
    // Bathroom
    SpawnHomeStation(EHomeStationType::BathroomShower, FVector(RoomX(3, 0.3), BackY + 55.0, 4.0), FVector(100.0, 100.0, 12.0), 0.0f, FLinearColor(0.7f, 0.82f, 0.88f), TEXT(""), TEXT(""));
    SpawnHomeStation(EHomeStationType::BathroomSink, FVector(RoomX(3, 0.78), BackY + 25.0, 4.0), FVector(60.0, 45.0, 85.0), 0.0f, FLinearColor(0.92f, 0.92f, 0.92f), TEXT(""), TEXT(""));

    // Courtyard: sweeping corner, laundry tub, clothesline, polytank.
    const double YardMidY = (FrontY + MaxY) * 0.5;
    SpawnHomeStation(EHomeStationType::CourtyardSweep, FVector(MinX + WallT + 40.0, MaxY - 120.0, 0.0), FVector(40.0, 40.0, 120.0), 0.0f, FLinearColor(0.75f, 0.6f, 0.2f), TEXT(""), TEXT(""));
    SpawnHomeStation(EHomeStationType::LaundryWashTub, FVector(MinX + Width * 0.25, YardMidY + 40.0, 0.0), FVector(90.0, 60.0, 55.0), 0.0f, FLinearColor(0.15f, 0.35f, 0.75f), TEXT(""), TEXT(""));
    const double LineX = MinX + Width * 0.62;
    AddShape(CylinderMesh, FVector(LineX - 220.0, YardMidY, 0.0), FVector(8.0, 8.0, 190.0), 0.0f, TamaleGreybox::Wood, true);
    AddShape(CylinderMesh, FVector(LineX + 220.0, YardMidY, 0.0), FVector(8.0, 8.0, 190.0), 0.0f, TamaleGreybox::Wood, true);
    AddShape(CubeMesh, FVector(LineX, YardMidY, 180.0), FVector(440.0, 2.0, 2.0), 0.0f, FLinearColor(0.9f, 0.9f, 0.9f), false);
    SpawnHomeStation(EHomeStationType::Clothesline, FVector(LineX, YardMidY, 0.0), FVector(60.0, 20.0, 10.0), 0.0f, FLinearColor(0.9f, 0.9f, 0.9f), TEXT(""), TEXT(""));
    AddShape(CubeMesh, FVector(MaxX - 110.0, FrontY + 110.0, 0.0), FVector(150.0, 150.0, 120.0), 0.0f, TamaleGreybox::Cement, true);    // tank stand
    AddShape(CylinderMesh, FVector(MaxX - 110.0, FrontY + 110.0, 120.0), FVector(140.0, 140.0, 170.0), 0.0f, TamaleGreybox::PolytankBlack, true);

    AddLabel(TEXT("Home - Changli Compound"), FVector(Center.X, MaxY + 40.0, 300.0), 60.0f, FColor(140, 255, 170));
}

void ATamaleCityBootstrapActor::SpawnHomeStation(EHomeStationType Type, const FVector& BaseLocation, const FVector& SizeCm, float YawDegrees,
                                                 const FLinearColor& Color, const FString& Prompt, const FString& DagbaniLabel)
{
    FActorSpawnParameters Params;
    Params.Owner = this;
    Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
    ATamaleHomeStationActor* Station = GetWorld()->SpawnActor<ATamaleHomeStationActor>(BaseLocation, FRotator(0.0f, YawDegrees, 0.0f), Params);
    if (!Station)
    {
        return;
    }
    Station->StationType = Type;
    Station->PromptLabel = Prompt.IsEmpty() ? FText::GetEmpty() : FText::FromString(Prompt);
    Station->DagbaniLabel = DagbaniLabel.IsEmpty() ? FText::GetEmpty() : FText::FromString(DagbaniLabel);
    if (Station->StationMesh)
    {
        Station->StationMesh->SetStaticMesh(CubeMesh);
        Station->StationMesh->SetRelativeLocation(FVector(0.0, 0.0, SizeCm.Z * 0.5));
        Station->StationMesh->SetRelativeScale3D(SizeCm / 100.0);
        Station->StationMesh->SetMaterial(0, GetColorMaterial(Color));
    }
    if (Station->InteractVolume)
    {
        // Make the "looked-at" volume cover the object plus a little margin, from floor to head height.
        const FVector Extent(FMath::Max(50.0, SizeCm.X * 0.5 + 20.0), FMath::Max(50.0, SizeCm.Y * 0.5 + 20.0), 90.0);
        Station->InteractVolume->SetBoxExtent(Extent);
        Station->InteractVolume->SetRelativeLocation(FVector(0.0, 0.0, 90.0));
    }
}

void ATamaleCityBootstrapActor::SpawnNpcs(const UTamaleDataRegistrySubsystem& Data)
{
    UWorld* World = GetWorld();
    for (const FTamaleNpcRow& Row : Data.Npcs)
    {
        const FVector Home(Row.HomeLocationCm.X, Row.HomeLocationCm.Y, 100.0);
        const FTransform SpawnTransform(FRotator::ZeroRotator, Home);
        ATamaleNpcCharacter* Npc = World->SpawnActorDeferred<ATamaleNpcCharacter>(
            ATamaleNpcCharacter::StaticClass(), SpawnTransform, this, nullptr, ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn);
        if (!Npc)
        {
            continue;
        }
        Npc->NpcDisplayName = Row.DisplayName;
        Npc->NpcRole = Row.Role;
        Npc->MorningGreetingDagbani = Row.MorningGreetingDagbani;
        Npc->MorningGreetingEnglish = Row.MorningGreetingEnglish;
        Npc->EveningGreetingDagbani = Row.EveningGreetingDagbani;
        Npc->EveningGreetingEnglish = Row.EveningGreetingEnglish;
        // Short loop around their home spot until schedules arrive in Batch 4.
        Npc->PatrolWaypoints = { Home + FVector(500.0, 0.0, 0.0), Home + FVector(-500.0, 0.0, 0.0) };
        Npc->FinishSpawning(SpawnTransform);
    }
}

// ---------------------------------------------------------------------------------------------

void ATamaleCityBootstrapActor::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    UpdateLabels();
}

void ATamaleCityBootstrapActor::UpdateLabels()
{
    const APlayerCameraManager* Camera = UGameplayStatics::GetPlayerCameraManager(this, 0);
    if (!Camera || Labels.Num() == 0)
    {
        return;
    }
    const FVector CamLoc = Camera->GetCameraLocation();
    const double MaxDistSq = FMath::Square(LabelVisibleDistanceCm);

    for (UTextRenderComponent* Label : Labels)
    {
        if (!Label) continue;
        const FVector LabelLoc = Label->GetComponentLocation();
        const bool bVisible = FVector::DistSquared(CamLoc, LabelLoc) <= MaxDistSq;
        Label->SetVisibility(bVisible);
        if (bVisible)
        {
            // Text renders face +X, so yaw the label towards the camera (billboard on the vertical axis only).
            const FVector ToCamera = CamLoc - LabelLoc;
            Label->SetWorldRotation(FRotator(0.0f, ToCamera.Rotation().Yaw, 0.0f));
        }
    }
}
